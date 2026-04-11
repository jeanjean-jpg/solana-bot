import type { Keypair } from "@solana/web3.js";
import { logger } from "../core/logger.js";

export type PerpMarketSymbol = "SOL-PERP" | "BTC-PERP" | "ETH-PERP";

export interface OpenPerpParams {
  keypair: Keypair;
  market: PerpMarketSymbol;
  direction: "long" | "short";
  usdSize: number;
  leverage: number;
  takeProfitPct?: number;
  stopLossPct?: number;
}

/**
 * Opens a perpetual position on Drift Protocol.
 * Full Drift SDK integration in Plan B — this is the interface stub.
 */
export async function openPerpPosition(params: OpenPerpParams): Promise<string> {
  logger.info(
    {
      market: params.market,
      direction: params.direction,
      size: params.usdSize,
      leverage: params.leverage,
    },
    "openPerpPosition called (Drift SDK stub — full impl in Plan B)"
  );
  // TODO Plan B: initialize DriftClient, call driftClient.openPosition()
  throw new Error("Drift SDK not yet integrated — coming in Plan B");
}

/**
 * Closes an open perpetual position on Drift Protocol.
 */
export async function closePerpPosition(
  _keypair: Keypair,
  _marketIndex: number
): Promise<string> {
  logger.info({ marketIndex: _marketIndex }, "closePerpPosition called (stub)");
  throw new Error("Drift SDK not yet integrated — coming in Plan B");
}
