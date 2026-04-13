import { BaseStrategy, type StrategyConfig } from "./base.js";
import { logger } from "../core/logger.js";
import { getTokenPrice } from "../market/price.js";
import { executeSwap } from "../execution/jupiter.js";
import { getDynamicPriorityFee } from "../execution/priorityFee.js";
import { sendAndConfirmTransaction } from "../execution/txSender.js";
import { insertPosition, removePosition, getOpenPositions } from "../state/positions.js";
import { recordTrade } from "../state/trades.js";
import { riskManager } from "../risk/riskManager.js";
import { notify } from "../notify/telegram.js";
import { supabase } from "../state/supabase.js";
import { env } from "../config/env.js";
import { MINTS } from "../config/constants.js";
import { getKeypairForWallet } from "../core/wallet.js";
import { PublicKey } from "@solana/web3.js";

interface DcaConfig {
  token_mint: string;
  token_symbol?: string;
  entry_size_usd: number;
  dca_size_usd: number;
  dip_trigger_pct: number;
  take_profit_pct: number;
  max_buys: number;
}

export class DcaStrategy extends BaseStrategy {
  readonly name = "DCA Accumulator";
  private interval: ReturnType<typeof setInterval> | null = null;
  private cfg!: DcaConfig;
  private strategyId!: string;
  private walletId!: string;
  private positionId: string | null = null;
  private lastBuyPrice = 0;
  private averageEntry = 0;
  private totalTokens = 0;
  private totalUsdSpent = 0;
  private buyCount = 0;

  async start(config: StrategyConfig): Promise<void> {
    this.strategyId = config.id;
    this.walletId = config.wallet_id!;
    this.cfg = config.config as unknown as DcaConfig;
    this.running = true;

    // Initial buy
    await this.executeBuy(this.cfg.entry_size_usd, "initial entry");

    this.interval = setInterval(() => this.tick().catch(err =>
      logger.error(err, "DCA tick error")
    ), 30_000);
    logger.info({ strategy: this.strategyId }, "DCA started");
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    logger.info({ strategy: this.strategyId }, "DCA stopped");
  }

  async onConfigUpdate(config: StrategyConfig): Promise<void> {
    this.cfg = config.config as unknown as DcaConfig;
    logger.info({ strategy: this.strategyId }, "DCA config updated");
  }

  async sellAll(reason = "manual sell"): Promise<void> {
    if (!this.positionId || this.totalTokens <= 0) return;
    try {
      const keypair = await getKeypairForWallet(this.walletId, supabase, env.WALLET_ENCRYPTION_KEY);
      const fee = await getDynamicPriorityFee();
      const currentPrice = await getTokenPrice(this.cfg.token_mint);
      const amountLamports = BigInt(Math.floor(this.totalTokens * 1e9));

      const { txSignature, outAmount } = await executeSwap(
        { inputMint: this.cfg.token_mint, outputMint: MINTS.USDC, amountLamports },
        keypair, fee, sendAndConfirmTransaction
      );

      const exitUsd = Number(outAmount) / 1e6;
      const pnlUsd = exitUsd - this.totalUsdSpent;
      const pnlPct = (pnlUsd / this.totalUsdSpent) * 100;

      await recordTrade({
        strategyId: this.strategyId,
        walletId: this.walletId,
        tokenMint: this.cfg.token_mint,
        tokenSymbol: this.cfg.token_symbol,
        side: "sell",
        entryPrice: this.averageEntry,
        exitPrice: currentPrice,
        amountUsd: this.totalUsdSpent,
        pnlUsd,
        pnlPct,
        txSignature,
      });

      riskManager.recordTradeClosed(pnlUsd);
      await removePosition(this.positionId);
      this.positionId = null;
      this.resetState();

      if (pnlUsd >= 0) {
        notify.tpHit(this.cfg.token_symbol ?? this.cfg.token_mint, pnlUsd).catch(() => {});
      } else {
        notify.slHit(this.cfg.token_symbol ?? this.cfg.token_mint, pnlUsd).catch(() => {});
      }
      logger.info({ pnlUsd, pnlPct, reason }, "DCA position closed");
    } catch (err) {
      logger.error(err, "DCA sellAll failed");
    }
  }

  private async tick(): Promise<void> {
    if (!this.running) return;
    const currentPrice = await getTokenPrice(this.cfg.token_mint);

    // Check take profit
    if (this.positionId && this.averageEntry > 0) {
      const tpPrice = this.averageEntry * (1 + this.cfg.take_profit_pct / 100);
      if (currentPrice >= tpPrice) {
        await this.sellAll("take profit");
        return;
      }
    }

    // Check DCA rebuy
    if (this.positionId && this.buyCount < this.cfg.max_buys && this.lastBuyPrice > 0) {
      const dipPrice = this.lastBuyPrice * (1 - this.cfg.dip_trigger_pct / 100);
      if (currentPrice <= dipPrice) {
        await this.executeBuy(this.cfg.dca_size_usd, `dip rebuy #${this.buyCount + 1}`);
      }
    }
  }

  private async executeBuy(sizeUsd: number, reason: string): Promise<void> {
    const walletBalance = sizeUsd * 20; // rough estimate; real check in RiskManager
    const rejection = await riskManager.checkPreTrade({
      tradeAmountUsd: sizeUsd,
      walletBalanceUsd: walletBalance,
      strategyId: this.strategyId,
    });
    if (rejection) { logger.warn({ reason: rejection }, "DCA buy rejected by risk manager"); return; }

    try {
      const keypair = await getKeypairForWallet(this.walletId, supabase, env.WALLET_ENCRYPTION_KEY);
      const fee = await getDynamicPriorityFee();
      const amountLamports = BigInt(Math.floor(sizeUsd * 1e6)); // USDC has 6 decimals
      const currentPrice = await getTokenPrice(this.cfg.token_mint);

      const { txSignature, outAmount } = await executeSwap(
        { inputMint: MINTS.USDC, outputMint: this.cfg.token_mint, amountLamports },
        keypair, fee, sendAndConfirmTransaction
      );

      const tokensReceived = Number(outAmount) / 1e9; // adjust per token decimals
      this.totalTokens += tokensReceived;
      this.totalUsdSpent += sizeUsd;
      this.averageEntry = this.totalUsdSpent / this.totalTokens;
      this.lastBuyPrice = currentPrice;
      this.buyCount++;

      const tpPrice = this.averageEntry * (1 + this.cfg.take_profit_pct / 100);

      if (!this.positionId) {
        this.positionId = await insertPosition({
          strategyId: this.strategyId,
          walletId: this.walletId,
          tokenMint: this.cfg.token_mint,
          tokenSymbol: this.cfg.token_symbol,
          side: "spot",
          entryPrice: this.averageEntry,
          amountUsd: sizeUsd,
          amountTokens: tokensReceived,
          takeProfitPrice: tpPrice,
          txSignature,
        });
      }

      notify.fill(this.cfg.token_symbol ?? this.cfg.token_mint, "buy", sizeUsd, txSignature).catch(() => {});
      logger.info({ reason, sizeUsd, currentPrice, buyCount: this.buyCount }, "DCA buy executed");
    } catch (err) {
      logger.error(err, "DCA executeBuy failed");
    }
  }

  private resetState(): void {
    this.lastBuyPrice = 0;
    this.averageEntry = 0;
    this.totalTokens = 0;
    this.totalUsdSpent = 0;
    this.buyCount = 0;
  }
}
