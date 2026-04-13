import { BaseStrategy, type StrategyConfig } from "./base.js";
import { logger } from "../core/logger.js";
import { getOHLCV } from "../market/birdeye.js";
import { calculateEMA, calculateRSI, bullishCross, bearishCross } from "../market/indicators.js";
import { executeSwap } from "../execution/jupiter.js";
import { getDynamicPriorityFee } from "../execution/priorityFee.js";
import { sendAndConfirmTransaction } from "../execution/txSender.js";
import { insertPosition, removePosition } from "../state/positions.js";
import { recordTrade } from "../state/trades.js";
import { riskManager } from "../risk/riskManager.js";
import { notify } from "../notify/telegram.js";
import { supabase } from "../state/supabase.js";
import { env } from "../config/env.js";
import { MINTS } from "../config/constants.js";
import { getKeypairForWallet } from "../core/wallet.js";
import { getTokenPrice } from "../market/price.js";

interface SwingConfig {
  token_mint: string;
  token_symbol?: string;
  fast_ema: number;
  slow_ema: number;
  rsi_period: number;
  rsi_oversold: number;
  rsi_overbought: number;
  position_size_usd: number;
  stop_loss_pct: number;
  take_profit_pct: number;
}

export class SwingStrategy extends BaseStrategy {
  readonly name = "Swing Trading";
  private interval: ReturnType<typeof setInterval> | null = null;
  private cfg!: SwingConfig;
  private strategyId!: string;
  private walletId!: string;
  private positionId: string | null = null;
  private entryPrice = 0;

  async start(config: StrategyConfig): Promise<void> {
    this.strategyId = config.id;
    this.walletId = config.wallet_id!;
    this.cfg = config.config as unknown as SwingConfig;
    this.running = true;
    this.interval = setInterval(() => this.tick().catch(err =>
      logger.error(err, "Swing tick error")
    ), 60_000);
    logger.info({ strategy: this.strategyId }, "Swing started");
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    logger.info({ strategy: this.strategyId }, "Swing stopped");
  }

  async onConfigUpdate(config: StrategyConfig): Promise<void> {
    this.cfg = config.config as unknown as SwingConfig;
  }

  private async tick(): Promise<void> {
    if (!this.running) return;

    const candles = await getOHLCV(this.cfg.token_mint, "15m", 100);
    if (candles.length < Math.max(this.cfg.slow_ema, this.cfg.rsi_period) + 2) return;

    const closes = candles.map(c => c.close);
    const fastEMA = calculateEMA(closes, this.cfg.fast_ema);
    const slowEMA = calculateEMA(closes, this.cfg.slow_ema);
    const rsi = calculateRSI(closes, this.cfg.rsi_period);
    const currentPrice = closes[closes.length - 1];

    if (!this.positionId) {
      // Entry: bullish EMA cross + RSI oversold
      if (bullishCross(fastEMA, slowEMA) && rsi < this.cfg.rsi_oversold) {
        const rejection = await riskManager.checkPreTrade({
          tradeAmountUsd: this.cfg.position_size_usd,
          walletBalanceUsd: this.cfg.position_size_usd * 10,
          strategyId: this.strategyId,
        });
        if (rejection) { logger.warn({ rejection }, "Swing entry rejected"); return; }
        await this.openPosition(currentPrice);
      }
    } else {
      // Exit: bearish cross OR RSI overbought
      if (bearishCross(fastEMA, slowEMA) || rsi > this.cfg.rsi_overbought) {
        await this.closePosition(currentPrice, "signal exit");
      }
    }
  }

  private async openPosition(currentPrice: number): Promise<void> {
    try {
      const keypair = await getKeypairForWallet(this.walletId, supabase, env.WALLET_ENCRYPTION_KEY);
      const fee = await getDynamicPriorityFee();
      const amountLamports = BigInt(Math.floor(this.cfg.position_size_usd * 1e6));

      const { txSignature, outAmount } = await executeSwap(
        { inputMint: MINTS.USDC, outputMint: this.cfg.token_mint, amountLamports },
        keypair, fee, sendAndConfirmTransaction
      );

      const tokensReceived = Number(outAmount) / 1e9;
      this.entryPrice = currentPrice;
      const slPrice = currentPrice * (1 - this.cfg.stop_loss_pct / 100);
      const tpPrice = currentPrice * (1 + this.cfg.take_profit_pct / 100);

      this.positionId = await insertPosition({
        strategyId: this.strategyId,
        walletId: this.walletId,
        tokenMint: this.cfg.token_mint,
        tokenSymbol: this.cfg.token_symbol,
        side: "spot",
        entryPrice: currentPrice,
        amountUsd: this.cfg.position_size_usd,
        amountTokens: tokensReceived,
        stopLossPrice: slPrice,
        takeProfitPrice: tpPrice,
        txSignature,
      });
      notify.fill(this.cfg.token_symbol ?? this.cfg.token_mint, "buy", this.cfg.position_size_usd, txSignature).catch(() => {});
      logger.info({ currentPrice, positionId: this.positionId }, "Swing position opened");
    } catch (err) {
      logger.error(err, "Swing openPosition failed");
    }
  }

  private async closePosition(currentPrice: number, reason: string): Promise<void> {
    if (!this.positionId) return;
    try {
      const keypair = await getKeypairForWallet(this.walletId, supabase, env.WALLET_ENCRYPTION_KEY);
      const fee = await getDynamicPriorityFee();
      // get actual token balance from position
      const { data: pos } = await supabase.from("positions").select("amount_tokens").eq("id", this.positionId).single();
      const amountLamports = BigInt(Math.floor((pos?.amount_tokens ?? 0) * 1e9));

      const { txSignature, outAmount } = await executeSwap(
        { inputMint: this.cfg.token_mint, outputMint: MINTS.USDC, amountLamports },
        keypair, fee, sendAndConfirmTransaction
      );

      const exitUsd = Number(outAmount) / 1e6;
      const pnlUsd = exitUsd - this.cfg.position_size_usd;
      const pnlPct = (pnlUsd / this.cfg.position_size_usd) * 100;

      await recordTrade({
        strategyId: this.strategyId, walletId: this.walletId,
        tokenMint: this.cfg.token_mint, tokenSymbol: this.cfg.token_symbol,
        side: "sell", entryPrice: this.entryPrice, exitPrice: currentPrice,
        amountUsd: this.cfg.position_size_usd, pnlUsd, pnlPct, txSignature,
      });
      riskManager.recordTradeClosed(pnlUsd);
      await removePosition(this.positionId);
      this.positionId = null;
      this.entryPrice = 0;
      logger.info({ reason, pnlUsd, pnlPct }, "Swing position closed");
    } catch (err) {
      logger.error(err, "Swing closePosition failed");
    }
  }
}
