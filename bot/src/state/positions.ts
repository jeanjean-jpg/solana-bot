import { supabase } from "./supabase.js";
import { logger } from "../core/logger.js";

export interface PositionInsertParams {
  strategyId: string;
  walletId: string;
  tokenMint: string;
  tokenSymbol?: string;
  side: "long" | "short" | "spot";
  entryPrice: number;
  amountUsd: number;
  amountTokens: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  leverage?: number;
  txSignature?: string;
}

export function buildPositionInsert(params: PositionInsertParams) {
  return {
    strategy_id: params.strategyId,
    wallet_id: params.walletId,
    token_mint: params.tokenMint,
    token_symbol: params.tokenSymbol ?? null,
    side: params.side,
    entry_price: params.entryPrice,
    amount_usd: params.amountUsd,
    amount_tokens: params.amountTokens,
    stop_loss_price: params.stopLossPrice ?? null,
    take_profit_price: params.takeProfitPrice ?? null,
    leverage: params.leverage ?? 1,
    tx_signature: params.txSignature ?? null,
  };
}

export async function insertPosition(params: PositionInsertParams): Promise<string> {
  const { data, error } = await supabase
    .from("positions")
    .insert(buildPositionInsert(params))
    .select("id")
    .single();
  if (error) throw new Error(`insertPosition failed: ${error.message}`);
  logger.info({ positionId: data.id, strategy: params.strategyId }, "Position inserted");
  return data.id as string;
}

export async function removePosition(positionId: string): Promise<void> {
  const { error } = await supabase.from("positions").delete().eq("id", positionId);
  if (error) throw new Error(`removePosition failed: ${error.message}`);
}

export async function getOpenPositions() {
  const { data, error } = await supabase.from("positions").select("*");
  if (error) throw new Error(`getOpenPositions failed: ${error.message}`);
  return data ?? [];
}
