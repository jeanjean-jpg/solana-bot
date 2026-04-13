import { BaseStrategy, type StrategyConfig } from "./base.js";
import { logger } from "../core/logger.js";
import { checkRug } from "../market/birdeye.js";
import { getTokenPrice } from "../market/price.js";
import { executeSwap } from "../execution/jupiter.js";
import { getDynamicPriorityFee } from "../execution/priorityFee.js";
import { sendAndConfirmTransaction } from "../execution/txSender.js";
import { insertPosition, removePosition } from "../state/positions.js";
import { recordTrade } from "../state/trades.js";
import { riskManager } from "../risk/riskManager.js";
import { notify } from "../notify/telegram.js";
import { supabase } from "../state/supabase.js";
import { env } from "../config/env.js";
import { MINTS } from "../config/constants.js";
import { getKeypairForWallet } from "../core/wallet.js";
import { getConnection } from "../core/connection.js";
import { PublicKey } from "@solana/web3.js";

const RAYDIUM_AMM_PROGRAM = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";

interface SniperConfig {
  max_buy_usd: number;
  take_profit_pct: number;
  auto_sell_seconds: number;
  min_liquidity_usd: number;
  min_rugcheck_score: number;
}

export class SniperStrategy extends BaseStrategy {
  readonly name = "Sniping";
  private cfg!: SniperConfig;
  private strategyId!: string;
  private walletId!: string;
  private logsSubscriptionId: number | null = null;
  private activePositions = new Map<string, { positionId: string; tokens: number; entryUsd: number; timer: ReturnType<typeof setTimeout> }>();

  async start(config: StrategyConfig): Promise<void> {
    this.strategyId = config.id;
    this.walletId = config.wallet_id!;
    this.cfg = config.config as unknown as SniperConfig;
    this.running = true;

    const connection = getConnection();
    this.logsSubscriptionId = connection.onLogs(
      new PublicKey(RAYDIUM_AMM_PROGRAM),
      async (logs) => {
        if (!this.running) return;
        // Detect pool initialization (init_pc_amount instruction)
        if (logs.logs.some(l => l.includes("initialize2") || l.includes("InitializeInstruction2"))) {
          await this.handleNewPool(logs.signature).catch(err =>
            logger.error(err, "Sniper pool handler error")
          );
        }
      },
      "confirmed"
    );
    logger.info({ strategy: this.strategyId }, "Sniper listening for new Raydium pools");
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.logsSubscriptionId !== null) {
      const connection = getConnection();
      await connection.removeOnLogsListener(this.logsSubscriptionId);
      this.logsSubscriptionId = null;
    }
    // Cancel all auto-sell timers
    for (const [, pos] of this.activePositions) {
      clearTimeout(pos.timer);
    }
    this.activePositions.clear();
    logger.info({ strategy: this.strategyId }, "Sniper stopped");
  }

  async onConfigUpdate(config: StrategyConfig): Promise<void> {
    this.cfg = config.config as unknown as SniperConfig;
  }

  private async handleNewPool(signature: string): Promise<void> {
    const connection = getConnection();
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) return;

    // Extract new token mint from the transaction's post-token-balances
    const postBalances = tx.meta?.postTokenBalances ?? [];
    const newMint = postBalances.find(b =>
      b.mint !== MINTS.SOL && b.mint !== MINTS.USDC && b.mint !== MINTS.USDT
    )?.mint;

    if (!newMint) return;
    logger.info({ mint: newMint, signature }, "New Raydium pool detected");

    // Rug check
    const rug = await checkRug(newMint);
    if (rug.score < this.cfg.min_rugcheck_score) {
      logger.warn({ mint: newMint, score: rug.score, min: this.cfg.min_rugcheck_score }, "Sniper: rug check failed");
      return;
    }
    if (!rug.mintAuthorityDisabled) {
      logger.warn({ mint: newMint }, "Sniper: mint authority not renounced");
      return;
    }

    // Check risk manager
    const rejection = await riskManager.checkPreTrade({
      tradeAmountUsd: this.cfg.max_buy_usd,
      walletBalanceUsd: this.cfg.max_buy_usd * 10,
      strategyId: this.strategyId,
    });
    if (rejection) { logger.warn({ rejection }, "Sniper buy rejected"); return; }

    await this.snipeToken(newMint);
  }

  private async snipeToken(mint: string): Promise<void> {
    try {
      const keypair = await getKeypairForWallet(this.walletId, supabase, env.WALLET_ENCRYPTION_KEY);
      const fee = await getDynamicPriorityFee();
      const amountLamports = BigInt(Math.floor(this.cfg.max_buy_usd * 1e6));
      const currentPrice = await getTokenPrice(mint).catch(() => 0);

      const { txSignature, outAmount } = await executeSwap(
        { inputMint: MINTS.USDC, outputMint: mint, amountLamports, slippageBps: 300 },
        keypair, fee, sendAndConfirmTransaction
      );

      const tokensReceived = Number(outAmount) / 1e9;
      const tpPrice = currentPrice * (1 + this.cfg.take_profit_pct / 100);

      const positionId = await insertPosition({
        strategyId: this.strategyId, walletId: this.walletId,
        tokenMint: mint, side: "spot",
        entryPrice: currentPrice, amountUsd: this.cfg.max_buy_usd,
        amountTokens: tokensReceived, takeProfitPrice: tpPrice, txSignature,
      });

      notify.fill(mint.slice(0, 8) + "...", "snipe buy", this.cfg.max_buy_usd, txSignature).catch(() => {});

      // Auto-sell timer
      const timer = setTimeout(() => {
        this.forceSell(mint, positionId, tokensReceived).catch(err =>
          logger.error(err, "Sniper force sell failed")
        );
      }, this.cfg.auto_sell_seconds * 1000);

      this.activePositions.set(mint, { positionId, tokens: tokensReceived, entryUsd: this.cfg.max_buy_usd, timer });
      logger.info({ mint, positionId, amountUsd: this.cfg.max_buy_usd }, "Snipe executed");
    } catch (err) {
      logger.error(err, "Sniper snipeToken failed");
    }
  }

  private async forceSell(mint: string, positionId: string, tokens: number): Promise<void> {
    const pos = this.activePositions.get(mint);
    if (!pos) return;
    clearTimeout(pos.timer);
    this.activePositions.delete(mint);

    try {
      const keypair = await getKeypairForWallet(this.walletId, supabase, env.WALLET_ENCRYPTION_KEY);
      const fee = await getDynamicPriorityFee();
      const amountLamports = BigInt(Math.floor(tokens * 1e9));
      const currentPrice = await getTokenPrice(mint).catch(() => 0);

      const { txSignature, outAmount } = await executeSwap(
        { inputMint: mint, outputMint: MINTS.USDC, amountLamports, slippageBps: 500 },
        keypair, fee, sendAndConfirmTransaction
      );

      const exitUsd = Number(outAmount) / 1e6;
      const pnlUsd = exitUsd - pos.entryUsd;

      await recordTrade({
        strategyId: this.strategyId, walletId: this.walletId,
        tokenMint: mint, side: "sell", amountUsd: pos.entryUsd,
        exitPrice: currentPrice, pnlUsd, pnlPct: (pnlUsd / pos.entryUsd) * 100, txSignature,
      });
      riskManager.recordTradeClosed(pnlUsd);
      await removePosition(positionId);
      logger.info({ mint, pnlUsd }, "Sniper auto-sell completed");
    } catch (err) {
      logger.error(err, "Sniper forceSell failed");
    }
  }
}
