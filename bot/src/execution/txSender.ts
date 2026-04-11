import { VersionedTransaction } from "@solana/web3.js";
import { getConnection } from "../core/connection.js";
import { logger } from "../core/logger.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1_500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendAndConfirmTransaction(tx: VersionedTransaction): Promise<string> {
  const connection = getConnection();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const rawTx = tx.serialize();
      const signature = await connection.sendRawTransaction(rawTx, {
        skipPreflight: false,
        maxRetries: 0,
      });
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      return signature;
    } catch (err) {
      lastError = err as Error;
      logger.warn({ attempt, err: (err as Error).message }, "TX send failed, retrying");
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError ?? new Error("TX failed after max retries");
}
