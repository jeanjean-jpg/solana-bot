import { Connection } from "@solana/web3.js";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(env.HELIUS_RPC_URL, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60_000,
    });
    logger.info("Solana connection initialized via Helius");
  }
  return _connection;
}
