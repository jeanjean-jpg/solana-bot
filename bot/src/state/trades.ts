import { supabase } from "./supabase.js";
import { logger } from "../core/logger.js";

export interface TradeRecordParams {
  strategyId?: string;
  walletId?: string;
  tokenMint?: string;
  tokenSymbol?: string;
  side: string;
  entryPrice?: number;
  exitPrice?: number;
  amountUsd?: number;
  pnlUsd?: number;
  pnlPct?: number;
  feesSol?: number;
  txSignature?: string;
  durationSeconds?: number;
}

export async function recordTrade(params: TradeRecordParams): Promise<void> {
  const { error } = await supabase.from("trades").insert({
    strategy_id: params.strategyId ?? null,
    wallet_id: params.walletId ?? null,
    token_mint: params.tokenMint ?? null,
    token_symbol: params.tokenSymbol ?? null,
    side: params.side,
    entry_price: params.entryPrice ?? null,
    exit_price: params.exitPrice ?? null,
    amount_usd: params.amountUsd ?? null,
    pnl_usd: params.pnlUsd ?? null,
    pnl_pct: params.pnlPct ?? null,
    fees_sol: params.feesSol ?? null,
    tx_signature: params.txSignature ?? null,
    duration_seconds: params.durationSeconds ?? null,
  });
  if (error) logger.error(error, "Failed to record trade");
  else logger.info({ strategy: params.strategyId, pnl: params.pnlUsd }, "Trade recorded");
}
