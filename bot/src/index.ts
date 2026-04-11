import { logger } from "./core/logger.js";
import { startHeartbeat, isBotRunning } from "./state/botState.js";

logger.info("SolBot starting up...");

async function main() {
  logger.info("Bot engine ready. Waiting for commands from dashboard.");

  const heartbeat = startHeartbeat(() => 0);
  logger.info("Heartbeat started");

  process.on("SIGTERM", () => {
    clearInterval(heartbeat);
    logger.info("Bot shut down gracefully");
    process.exit(0);
  });

  while (true) {
    const running = await isBotRunning().catch(() => false);
    if (running) {
      logger.debug("Bot is enabled — strategies will execute in Plan B");
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
}

main().catch((err) => {
  logger.error(err, "Fatal error");
  process.exit(1);
});
