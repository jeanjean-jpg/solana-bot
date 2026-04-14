import { logger } from "../core/logger.js";

const DEXSCREENER_URL = "https://api.dexscreener.com/latest/dex/tokens";

export async function getTokenPrice(mint: string): Promise<number> {
  const res = await fetch(`${DEXSCREENER_URL}/${mint}`);
  if (!res.ok) throw new Error(`Price fetch failed: ${res.status}`);
  const json = await res.json() as { pairs: Array<{ priceUsd: string; liquidity?: { usd: number } }> };
  const pairs = json.pairs ?? [];
  if (!pairs.length) throw new Error(`No price data for mint ${mint}`);
  // Pick the pair with highest liquidity
  const best = pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  const price = parseFloat(best.priceUsd ?? "0");
  logger.debug({ mint, price }, "Token price fetched");
  return price;
}

export async function getTokenPrices(mints: string[]): Promise<Record<string, number>> {
  if (!mints.length) return {};
  // DexScreener accepts up to ~30 comma-separated addresses
  const res = await fetch(`${DEXSCREENER_URL}/${mints.join(",")}`);
  if (!res.ok) throw new Error(`Price fetch failed: ${res.status}`);
  const json = await res.json() as { pairs: Array<{ baseToken: { address: string }; priceUsd: string; liquidity?: { usd: number } }> };
  const pairs = json.pairs ?? [];
  const result: Record<string, number> = {};
  for (const pair of pairs) {
    const addr = pair.baseToken?.address;
    if (!addr) continue;
    const price = parseFloat(pair.priceUsd ?? "0");
    // Keep the highest-liquidity price per mint
    if (!result[addr] || price > 0) result[addr] = price;
  }
  return result;
}
