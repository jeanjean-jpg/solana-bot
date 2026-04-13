import { BaseStrategy, type StrategyConfig } from "./base.js";
import { logger } from "../core/logger.js";
import { getRecentVolume } from "../market/birdeye.js";
import { getTokenPrice } from "../market/price.js";
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

interface ScalpingConfig {
  token_mint: string;
  token_symbol?: string;
  position_size_usd: number;
  volume_multiplier: number;
  profit_target_pct: number;
  stop_loss_pct: number;
  max_hold_seconds: number;
}

export class ScalpingStrategy extends BaseStrategy {
  readonly name = "Scalping";
  private interval: ReturnType<typeof setInterval> | null = null;
  private cfg!: ScalpingConfig;
  private strategyId!: string;
  private walletId!: string;
  private positionId: string | null = null;
  private entryPrice = 0;
  private entryTime = 0;
  private entryTokens = 0;

  async start(config: StrategyConfig): Promise<void> {
    this.strategyId = config.id;
    this.walletId = config.wallet_id!;
    this.cfg = config.config as unknown as ScalpingConfig;
    this.running = true;
    this.interval = setInterval(() => this.tick().catch(err =>
      logger.error(err, "Scalping tick error")
    ), 15_000);
    logger.info({ strategy: this.strategyId }, "Scalping started");
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    logger.info({ strategy: this.strategyId }, "Scalping stopped");
  }

  async onConfigUpdate(config: StrategyConfig): Promise<void> {
    this.cfg = config.config as unknown as ScalpingConfig;
  }

  private async tick(): Promise<void> {
    if (!this.running) return;
    const currentPrice = await getTokenPrice(this.cfg.token_mint);

    if (!this.positionId) {
      // Check for volume spike
      const { current, avg5m } = await getRecentVolume(this.cfg.token_mint);
      if (avg5m > 0 && current > this.cfg.volume_multiplier * avg5m) {
        const rejection = await riskManager.checkPreTrade({
          tradeAmountUsd: this.cfg.position_size_usd,
          walletBalanceUsd: this.cfg.position_size_usd * 10,
          strategyId: this.strategyId,
        });
        if (rejection) { logger.warn({ rejection }, "Scalp entry rejected"); return; }
        await this.openPosition(currentPrice);
      }
    } else {
      // Check max hold time
      const heldSeconds = (Date.now() - this.entryTime) / 1000;
      const tpPrice = this.entryPrice * (1 + this.cfg.profit_target_pct / 100);
      const slPrice = this.entryPrice * (1 - this.cfg.stop_loss_pct / 100);

      if (currentPrice >= tpPrice) {
        await this.closePosition(currentPrice, "take profit");
      } else if (currentPrice <= slPrice) {
        await this.closePosition(currentPrice, "stop loss");
      } else if (heldSeconds >= this.cfg.max_hold_seconds) {
        await this.closePosition(currentPrice, "max hold time");
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

      this.entryTokens = Number(outAmount) / 1e9;
      this.entryPrice = currentPrice;
      this.entryTime = Date.now();

      this.positionId = await insertPosition({
        strategyId: this.strategyId, walletId: this.walletId,
        tokenMint: this.cfg.token_mint, tokenSymbol: this.cfg.token_symbol,
        side: "spot", entryPrice: currentPrice,
        amountUsd: this.cfg.position_size_usd, amountTokens: this.entryTokens,
        stopLossPrice: currentPrice * (1 - this.cfg.stop_loss_pct / 100),
        takeProfitPrice: currentPrice * (1 + this.cfg.profit_target_pct / 100),
        txSignature,
      });
      notify.fill(this.cfg.token_symbol ?? this.cfg.token_mint, "scalp buy", this.cfg.position_size_usd, txSignature).catch(() => {});
    } catch (err) {
      logger.error(err, "Scalp openPosition failed");
    }
  }

  private async closePosition(currentPrice: number, reason: string): Promise<void> {
    if (!this.positionId) return;
    try {
      const keypair = await getKeypairForWallet(this.walletId, supabase, env.WALLET_ENCRYPTION_KEY);
      const fee = await getDynamicPriorityFee();
      const amountLamports = BigInt(Math.floor(this.entryTokens * 1e9));

      const { txSignature, outAmount } = await executeSwap(
        { inputMint: this.cfg.token_mint, outputMint: MINTS.USDC, amountLamports },
        keypair, fee, sendAndConfirmTransaction
      );

      const exitUsd = Number(outAmount) / 1e6;
      const pnlUsd = exitUsd - this.cfg.position_size_usd;
      const pnlPct = (pnlUsd / this.cfg.position_size_usd) * 100;
      const durationSeconds = (Date.now() - this.entryTime) / 1000;

      await recordTrade({
        strategyId: this.strategyId, walletId: this.walletId,
        tokenMint: this.cfg.token_mint, tokenSymbol: this.cfg.token_symbol,
        side: "sell", entryPrice: this.entryPrice, exitPrice: currentPrice,
        amountUsd: this.cfg.position_size_usd, pnlUsd, pnlPct,
        txSignature, durationSeconds,
      });
      riskManager.recordTradeClosed(pnlUsd);
      await removePosition(this.positionId);
      this.positionId = null;
      this.entryPrice = 0;
      this.entryTokens = 0;
      logger.info({ reason, pnlUsd, durationSeconds }, "Scalp closed");
    } catch (err) {
      logger.error(err, "Scalp closePosition failed");
    }
  }
}
