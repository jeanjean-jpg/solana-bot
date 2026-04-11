import { logger } from "./core/logger.js";

logger.info("SolBot starting up...");

async function main() {
  logger.info("Bot engine ready. Waiting for commands from dashboard.");

  process.on("SIGTERM", () => {
    logger.info("Bot shut down gracefully");
    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});
}

main().catch((err) => {
  logger.error(err, "Fatal error");
  process.exit(1);
});
