import { env } from "../config/env.js";
import { MAX_PRIORITY_FEE_LAMPORTS } from "../config/constants.js";
import { logger } from "../core/logger.js";

export async function getDynamicPriorityFee(): Promise<number> {
  try {
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getPriorityFeeEstimate",
        params: [{ options: { priorityLevel: "High" } }],
      }),
    });
    const data = await res.json() as { result: { priorityFeeEstimate: number } };
    const fee = Math.min(data.result.priorityFeeEstimate, MAX_PRIORITY_FEE_LAMPORTS);
    logger.debug({ fee }, "Priority fee estimate");
    return fee;
  } catch {
    logger.warn("Failed to get priority fee, using default");
    return 100_000;
  }
}
