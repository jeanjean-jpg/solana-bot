import { logger } from "../core/logger.js";
import { supabase } from "../state/supabase.js";
import { getTokenPrices } from "../market/price.js";
import { removePosition } from "../state/positions.js";
import { recordTrade } from "../state/trades.js";
import { riskManager } from "./riskManager.js";
import { notify } from "../notify/telegram.js";
import { MINTS } from "../config/constants.js";

const CHECK_INTERVAL_MS = 5_000;

let monitorInterval: ReturnType<typeof setInterval> | null = null;

// Injected by strategies that need Drift close — avoids circular deps
let driftClosePositionFn: ((positionId: string) => Promise<void>) | null = null;
let jupiterSellFn: ((params: {
  tokenMint: string;
  amountTokens: number;
  walletId: string;
}) => Promise<{ txSignature: string; pnlUsd: number }>) | null = null;

export function registerDriftClose(fn: (positionId: string) => Promise<void>): void {
  driftClosePositionFn = fn;
}

export function registerJupiterSell(fn: (params: {
  tokenMint: string;
  amountTokens: number;
  walletId: string;
}) => Promise<{ txSignature: string; pnlUsd: number }>): void {
  jupiterSellFn = fn;
}

export function startStopLossMonitor(): ReturnType<typeof setInterval> {
  if (monitorInterval) return monitorInterval;

  monitorInterval = setInterval(async () => {
    try {
      await checkAllPositions();
    } catch (err) {
      logger.error(err, "SL/TP monitor error");
    }
  }, CHECK_INTERVAL_MS);

  logger.info("SL/TP monitor started (5s interval)");
  return monitorInterval;
}

export function stopStopLossMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    logger.info("SL/TP monitor stopped");
  }
}

async function checkAllPositions(): Promise<void> {
  const { data: positions, error } = await supabase
    .from("positions")
    .select("*");

  if (error || !positions?.length) return;

  // Collect unique mints and fetch prices in one batch
  const mints = [...new Set(positions.map((p: Record<string, unknown>) => p.token_mint as string))];
  const prices = await getTokenPrices(mints).catch(() => ({} as Record<string, number>));

  for (const pos of positions) {
    const currentPrice = prices[pos.token_mint as string];
    if (!currentPrice) continue;

    const slPrice = pos.stop_loss_price as number | null;
    const tpPrice = pos.take_profit_price as number | null;
    const side = pos.side as string;

    let shouldClose = false;
    let reason: "sl" | "tp" | null = null;

    if (side === "spot" || side === "long") {
      if (slPrice && currentPrice <= slPrice) { shouldClose = true; reason = "sl"; }
      if (tpPrice && currentPrice >= tpPrice) { shouldClose = true; reason = "tp"; }
    } else if (side === "short") {
      if (slPrice && currentPrice >= slPrice) { shouldClose = true; reason = "sl"; }
      if (tpPrice && currentPrice <= tpPrice) { shouldClose = true; reason = "tp"; }
    }

    if (!shouldClose || !reason) continue;

    logger.info({ positionId: pos.id, reason, currentPrice }, "Closing position via SL/TP monitor");

    try {
      if (side === "spot" && jupiterSellFn) {
        const { txSignature, pnlUsd } = await jupiterSellFn({
          tokenMint: pos.token_mint as string,
          amountTokens: pos.amount_tokens as number,
          walletId: pos.wallet_id as string,
        });
        const pnlPct = pnlUsd / (pos.amount_usd as number) * 100;
        await recordTrade({
          strategyId: pos.strategy_id as string,
          walletId: pos.wallet_id as string,
          tokenMint: pos.token_mint as string,
          tokenSymbol: pos.token_symbol as string ?? undefined,
          side: "sell",
          entryPrice: pos.entry_price as number,
          exitPrice: currentPrice,
          amountUsd: pos.amount_usd as number,
          pnlUsd,
          pnlPct,
          txSignature,
        });
        riskManager.recordTradeClosed(pnlUsd);
        if (reason === "sl") notify.slHit(pos.token_symbol as string ?? pos.token_mint as string, pnlUsd).catch(() => {});
        if (reason === "tp") notify.tpHit(pos.token_symbol as string ?? pos.token_mint as string, pnlUsd).catch(() => {});
      } else if ((side === "long" || side === "short") && driftClosePositionFn) {
        await driftClosePositionFn(pos.id as string);
      }
      await removePosition(pos.id as string);
    } catch (err) {
      logger.error(err, `Failed to close position ${pos.id}`);
    }
  }
}
