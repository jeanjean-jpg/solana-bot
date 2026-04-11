// Token mints (mainnet)
export const MINTS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
} as const;

export const JUPITER_API_URL = "https://quote-api.jup.ag/v6";
export const DRIFT_PROGRAM_ID = "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH";

export const HEARTBEAT_INTERVAL_MS = 10_000;
export const PRICE_CHECK_INTERVAL_MS = 5_000;
export const SL_TP_CHECK_INTERVAL_MS = 5_000;

export const DEFAULT_SLIPPAGE_BPS = 50;
export const MAX_PRIORITY_FEE_LAMPORTS = 1_000_000;
