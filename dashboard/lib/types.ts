export type StrategyId = "dca" | "swing" | "scalping" | "sniping" | "copy_trade" | "perps";
export type PositionSide = "long" | "short" | "spot";
export type TradeSide = "buy" | "sell" | "long" | "short" | "close_long" | "close_short";
export type AlertType = "fill" | "sl_hit" | "tp_hit" | "error" | "circuit_breaker";

export interface Wallet {
  id: string;
  label: string;
  cold_wallet_address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BotState {
  id: number;
  is_running: boolean;
  last_heartbeat: string | null;
  active_strategy_count: number;
}

export interface Strategy {
  id: StrategyId;
  is_enabled: boolean;
  wallet_id: string | null;
  config: Record<string, unknown>;
  updated_at: string;
}

export interface Position {
  id: string;
  strategy_id: StrategyId;
  wallet_id: string;
  token_mint: string;
  token_symbol: string | null;
  side: PositionSide;
  entry_price: number;
  amount_usd: number;
  amount_tokens: number;
  stop_loss_price: number | null;
  take_profit_price: number | null;
  leverage: number;
  tx_signature: string | null;
  opened_at: string;
  metadata: Record<string, unknown>;
}

export interface Trade {
  id: string;
  strategy_id: string | null;
  wallet_id: string | null;
  token_mint: string | null;
  token_symbol: string | null;
  side: TradeSide | null;
  entry_price: number | null;
  exit_price: number | null;
  amount_usd: number | null;
  pnl_usd: number | null;
  pnl_pct: number | null;
  fees_sol: number | null;
  tx_signature: string | null;
  duration_seconds: number | null;
  closed_at: string;
}
