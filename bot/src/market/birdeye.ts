import { env } from "../config/env.js";
import { logger } from "../core/logger.js";

const BASE = "https://public-api.birdeye.so";

export interface OHLCVCandle {
  unixTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeInterval = "1m" | "3m" | "5m" | "15m" | "30m" | "1H" | "4H" | "1D";

export async function getOHLCV(
  mint: string,
  interval: TimeInterval = "15m",
  limit = 100
): Promise<OHLCVCandle[]> {
  if (!env.BIRDEYE_API_KEY) {
    throw new Error("BIRDEYE_API_KEY not set");
  }
  const url = `${BASE}/defi/ohlcv?address=${mint}&type=${interval}&limit=${limit}`;
  const res = await fetch(url, {
    headers: { "X-API-KEY": env.BIRDEYE_API_KEY },
  });
  if (!res.ok) throw new Error(`Birdeye OHLCV failed: ${res.status}`);
  const json = await res.json() as { data: { items: OHLCVCandle[] } };
  logger.debug({ mint, count: json.data.items.length }, "OHLCV fetched");
  return json.data.items;
}

export async function getRecentVolume(mint: string): Promise<{ current: number; avg5m: number }> {
  const candles = await getOHLCV(mint, "1m", 10);
  if (candles.length < 6) return { current: 0, avg5m: 0 };
  const current = candles[candles.length - 1].volume;
  const prev5 = candles.slice(-6, -1);
  const avg5m = prev5.reduce((s, c) => s + c.volume, 0) / prev5.length;
  return { current, avg5m };
}

export interface RugCheckResult {
  score: number;
  mintAuthorityDisabled: boolean;
  freezeAuthorityDisabled: boolean;
}

export async function checkRug(mint: string): Promise<RugCheckResult> {
  const res = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report/summary`);
  if (!res.ok) return { score: 0, mintAuthorityDisabled: false, freezeAuthorityDisabled: false };
  const json = await res.json() as {
    score: number;
    mintAuthority: string | null;
    freezeAuthority: string | null;
  };
  return {
    score: json.score ?? 0,
    mintAuthorityDisabled: json.mintAuthority === null,
    freezeAuthorityDisabled: json.freezeAuthority === null,
  };
}
