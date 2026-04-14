import { logger } from "../core/logger.js";

const JUPITER_PRICE_URL = "https://price.jup.ag/v6/price";

export interface TokenPrice {
  mint: string;
  price: number; // USD
}

export async function getTokenPrice(mint: string): Promise<number> {
  const res = await fetch(`${JUPITER_PRICE_URL}?ids=${mint}`);
  if (!res.ok) throw new Error(`Price fetch failed: ${res.status}`);
  const json = await res.json() as { data: Record<string, { price: number }> };
  const price = json.data[mint]?.price;
  if (price == null) throw new Error(`No price for mint ${mint}`);
  logger.debug({ mint, price }, "Token price fetched");
  return price;
}

export async function getTokenPrices(mints: string[]): Promise<Record<string, number>> {
  const res = await fetch(`${JUPITER_PRICE_URL}?ids=${mints.join(",")}`);
  if (!res.ok) throw new Error(`Price fetch failed: ${res.status}`);
  const json = await res.json() as { data: Record<string, { price: number }> };
  const result: Record<string, number> = {};
  for (const mint of mints) {
    if (json.data[mint]) result[mint] = json.data[mint].price;
  }
  return result;
}
