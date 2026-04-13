import { logger } from "./core/logger.js";
import { startHeartbeat, isBotRunning } from "./state/botState.js";
import { riskManager } from "./risk/riskManager.js";
import { startStopLossMonitor, stopStopLossMonitor, registerJupiterSell } from "./risk/stopLoss.js";
import { StrategyRunner } from "./strategies/runner.js";
import { executeSwap } from "./execution/jupiter.js";
import { getDynamicPriorityFee } from "./execution/priorityFee.js";
import { sendAndConfirmTransaction } from "./execution/txSender.js";
import { getKeypairForWallet } from "./core/wallet.js";
import { env } from "./config/env.js";
import { supabase } from "./state/supabase.js";
import { MINTS } from "./config/constants.js";
import { notify } from "./notify/telegram.js";

logger.info("SolBot starting up...");

const runner = new StrategyRunner();
let botRunning = false;

// Register the Jupiter sell function with the SL/TP monitor
registerJupiterSell(async ({ tokenMint, amountTokens, walletId }) => {
  const keypair = await getKeypairForWallet(walletId, supabase, env.WALLET_ENCRYPTION_KEY);
  const fee = await getDynamicPriorityFee();
  const amountLamports = BigInt(Math.floor(amountTokens * 1e9));
  const { txSignature, outAmount } = await executeSwap(
    { inputMint: tokenMint, outputMint: MINTS.USDC, amountLamports },
    keypair, fee, sendAndConfirmTransaction
  );
  const exitUsd = Number(outAmount) / 1e6;
  return { txSignature, pnlUsd: exitUsd }; // caller computes actual pnl
});

async function main() {
  await riskManager.loadConfig();

  const heartbeat = startHeartbeat(() => runner.getActiveCount());
  logger.info("Heartbeat started");

  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, shutting down...");
    clearInterval(heartbeat);
    stopStopLossMonitor();
    if (botRunning) {
      await runner.stop();
      notify.botStopped().catch(() => {});
    }
    logger.info("Bot shut down gracefully");
    process.exit(0);
  });

  // Main control loop — polls bot_state every 5s
  while (true) {
    try {
      const running = await isBotRunning();

      if (running && !botRunning) {
        logger.info("Bot enabled — starting strategies and monitors");
        await runner.start();
        startStopLossMonitor();
        botRunning = true;
        notify.botStarted().catch(() => {});
      } else if (!running && botRunning) {
        logger.info("Bot disabled — stopping strategies and monitors");
        await runner.stop();
        stopStopLossMonitor();
        botRunning = false;
        notify.botStopped().catch(() => {});
      }
    } catch (err) {
      logger.error(err, "Main loop error");
    }

    await new Promise((r) => setTimeout(r, 5_000));
  }
}

main().catch((err) => {
  logger.error(err, "Fatal error");
  process.exit(1);
});
