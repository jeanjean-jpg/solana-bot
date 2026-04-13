import { BaseStrategy, type StrategyConfig } from "./base.js";
import { logger } from "../core/logger.js";
import { getOHLCV } from "../market/birdeye.js";
import { calculateEMA, calculateRSI, bullishCross, bearishCross } from "../market/indicators.js";
import {
  openPerpPosition,
  closePerpPosition,
  getDriftOpenPositions,
  type PerpMarketSymbol,
} from "../execution/drift.js";
import { insertPosition, removePosition } from "../state/positions.js";
import { recordTrade } from "../state/trades.js";
import { riskManager } from "../risk/riskManager.js";
import { notify } from "../notify/telegram.js";
import { supabase } from "../state/supabase.js";
import { env } from "../config/env.js";
import { getKeypairForWallet } from "../core/wallet.js";
import { getConnection } from "../core/connection.js";
import { registerDriftClose } from "../risk/stopLoss.js";

interface PerpsConfig {
  market: PerpMarketSymbol;
  direction: "long" | "short";
  leverage: number;
  position_size_usd: number;
  entry_mode: "manual" | "signal";
  stop_loss_pct: number;
  take_profit_pct: number;
  rsi_period?: number;
  rsi_oversold?: number;
  rsi_overbought?: number;
}

export class PerpsStrategy extends BaseStrategy {
  readonly name = "Perps (Drift)";
  private interval: ReturnType<typeof setInterval> | null = null;
  private cfg!: PerpsConfig;
  private strategyId!: string;
  private walletId!: string;
  private positionId: string | null = null;
  private entryPrice = 0;

  async start(config: StrategyConfig): Promise<void> {
    this.strategyId = config.id;
    this.walletId = config.wallet_id!;
    this.cfg = config.config as unknown as PerpsConfig;
    this.running = true;

    // Register with SL/TP monitor so it can close Drift positions
    registerDriftClose(async (posId: string) => {
      if (posId === this.positionId) {
        await this.closePosition("sl/tp monitor");
      }
    });

    this.interval = setInterval(() => this.tick().catch(err =>
      logger.error(err, "Perps tick error")
    ), 30_000);
    logger.info({ strategy: this.strategyId, market: this.cfg.market }, "Perps started");
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    logger.info({ strategy: this.strategyId }, "Perps stopped");
  }

  async onConfigUpdate(config: StrategyConfig): Promise<void> {
    this.cfg = config.config as unknown as PerpsConfig;
  }

  private async tick(): Promise<void> {
    if (!this.running) return;

    // Check manual trigger from bot_state
    if (this.cfg.entry_mode === "manual") {
      await this.checkManualTrigger();
      return;
    }

    // Signal mode: EMA + RSI
    const candles = await getOHLCV(this.cfg.market.replace("-PERP", "USDC" as any), "15m", 100);
    if (candles.length < 30) return;

    const closes = candles.map(c => c.close);
    const fastEMA = calculateEMA(closes, 9);
    const slowEMA = calculateEMA(closes, 21);
    const rsi = calculateRSI(closes, this.cfg.rsi_period ?? 14);
    const currentPrice = closes[closes.length - 1];

    if (!this.positionId) {
      const isBull = this.cfg.direction === "long"
        ? bullishCross(fastEMA, slowEMA) && rsi < (this.cfg.rsi_oversold ?? 35)
        : bearishCross(fastEMA, slowEMA) && rsi > (this.cfg.rsi_overbought ?? 65);

      if (isBull) {
        const rejection = await riskManager.checkPreTrade({
          tradeAmountUsd: this.cfg.position_size_usd,
          walletBalanceUsd: this.cfg.position_size_usd * 10,
          strategyId: this.strategyId,
        });
        if (rejection) { logger.warn({ rejection }, "Perps entry rejected"); return; }
        await this.openPosition(currentPrice);
      }
    } else {
      const shouldExit = this.cfg.direction === "long"
        ? bearishCross(fastEMA, slowEMA) || rsi > (this.cfg.rsi_overbought ?? 70)
        : bullishCross(fastEMA, slowEMA) || rsi < (this.cfg.rsi_oversold ?? 30);
      if (shouldExit) {
        await this.closePosition("signal exit");
      }
    }
  }

  private async checkManualTrigger(): Promise<void> {
    const { data } = await supabase
      .from("bot_state")
      .select("manual_trigger")
      .eq("id", 1)
      .single();

    const trigger = data?.manual_trigger as Record<string, unknown> | null;
    if (!trigger) return;
    if (trigger.strategy_id !== this.strategyId) return;

    if (trigger.action === "open" && !this.positionId) {
      const price = (trigger.price as number) ?? 0;
      await this.openPosition(price);
    } else if (trigger.action === "close" && this.positionId) {
      await this.closePosition("manual close");
    }

    // Clear the trigger
    await supabase.from("bot_state").update({ manual_trigger: null }).eq("id", 1);
  }

  private async openPosition(markPrice: number): Promise<void> {
    try {
      const keypair = await getKeypairForWallet(this.walletId, supabase, env.WALLET_ENCRYPTION_KEY);
      const connection = getConnection();

      const txSig = await openPerpPosition({
        keypair,
        connection,
        market: this.cfg.market,
        direction: this.cfg.direction,
        usdSize: this.cfg.position_size_usd,
        leverage: this.cfg.leverage,
      });

      this.entryPrice = markPrice;
      const slPrice = this.cfg.direction === "long"
        ? markPrice * (1 - this.cfg.stop_loss_pct / 100)
        : markPrice * (1 + this.cfg.stop_loss_pct / 100);
      const tpPrice = this.cfg.direction === "long"
        ? markPrice * (1 + this.cfg.take_profit_pct / 100)
        : markPrice * (1 - this.cfg.take_profit_pct / 100);

      this.positionId = await insertPosition({
        strategyId: this.strategyId,
        walletId: this.walletId,
        tokenMint: this.cfg.market,
        tokenSymbol: this.cfg.market,
        side: this.cfg.direction,
        entryPrice: markPrice,
        amountUsd: this.cfg.position_size_usd,
        amountTokens: this.cfg.position_size_usd / markPrice * this.cfg.leverage,
        stopLossPrice: slPrice,
        takeProfitPrice: tpPrice,
        leverage: this.cfg.leverage,
        txSignature: txSig,
      });

      notify.fill(this.cfg.market, this.cfg.direction, this.cfg.position_size_usd, txSig).catch(() => {});
      logger.info({ market: this.cfg.market, direction: this.cfg.direction, markPrice }, "Perps position opened");
    } catch (err) {
      logger.error(err, "Perps openPosition failed");
    }
  }

  private async closePosition(reason: string): Promise<void> {
    if (!this.positionId) return;
    try {
      const keypair = await getKeypairForWallet(this.walletId, supabase, env.WALLET_ENCRYPTION_KEY);
      const connection = getConnection();

      const txSig = await closePerpPosition(keypair, connection, this.cfg.market);

      // Get current mark price for PnL calculation
      const openPositions = await getDriftOpenPositions(keypair, connection);
      const pos = openPositions.find(p => p.market === this.cfg.market);
      const markPrice = pos?.markPrice ?? this.entryPrice;
      const pnlUsd = pos?.unrealizedPnlUsd ?? 0;
      const pnlPct = this.entryPrice > 0 ? (pnlUsd / this.cfg.position_size_usd) * 100 : 0;

      await recordTrade({
        strategyId: this.strategyId,
        walletId: this.walletId,
        tokenMint: this.cfg.market,
        tokenSymbol: this.cfg.market,
        side: this.cfg.direction === "long" ? "close_long" : "close_short",
        entryPrice: this.entryPrice,
        exitPrice: markPrice,
        amountUsd: this.cfg.position_size_usd,
        pnlUsd,
        pnlPct,
        txSignature: txSig,
      });

      riskManager.recordTradeClosed(pnlUsd);
      await removePosition(this.positionId);
      this.positionId = null;
      this.entryPrice = 0;
      logger.info({ reason, market: this.cfg.market, pnlUsd }, "Perps position closed");
    } catch (err) {
      logger.error(err, "Perps closePosition failed");
    }
  }
}
