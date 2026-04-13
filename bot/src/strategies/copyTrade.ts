import { BaseStrategy, type StrategyConfig } from "./base.js";
import { logger } from "../core/logger.js";
import { executeSwap } from "../execution/jupiter.js";
import { getDynamicPriorityFee } from "../execution/priorityFee.js";
import { sendAndConfirmTransaction } from "../execution/txSender.js";
import { insertPosition } from "../state/positions.js";
import { notify } from "../notify/telegram.js";
import { supabase } from "../state/supabase.js";
import { env } from "../config/env.js";
import { MINTS } from "../config/constants.js";
import { getKeypairForWallet } from "../core/wallet.js";
import { riskManager } from "../risk/riskManager.js";
import { getConnection } from "../core/connection.js";
import { getTokenPrice } from "../market/price.js";
import { PublicKey } from "@solana/web3.js";

const JUPITER_PROGRAM = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const RAYDIUM_AMM_PROGRAM = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";

interface CopyTradeConfig {
  target_wallet: string;
  max_copy_size_usd: number;
  token_blacklist: string[];
}

interface DetectedSwap {
  tokenIn: string;
  tokenOut: string;
  amountInUsd: number;
}

export class CopyTradeStrategy extends BaseStrategy {
  readonly name = "Copy Trading";
  private cfg!: CopyTradeConfig;
  private strategyId!: string;
  private walletId!: string;
  private logsSubscriptionId: number | null = null;

  async start(config: StrategyConfig): Promise<void> {
    this.strategyId = config.id;
    this.walletId = config.wallet_id!;
    this.cfg = config.config as unknown as CopyTradeConfig;
    this.running = true;

    const connection = getConnection();
    this.logsSubscriptionId = connection.onLogs(
      new PublicKey(this.cfg.target_wallet),
      async (logs) => {
        if (!this.running) return;
        const isSwap =
          logs.logs.some(l => l.includes(JUPITER_PROGRAM) || l.includes(RAYDIUM_AMM_PROGRAM));
        if (isSwap) {
          await this.handleSwap(logs.signature).catch(err =>
            logger.error(err, "CopyTrade handler error")
          );
        }
      },
      "confirmed"
    );
    logger.info({ strategy: this.strategyId, target: this.cfg.target_wallet }, "Copy trade watching wallet");
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.logsSubscriptionId !== null) {
      const connection = getConnection();
      await connection.removeOnLogsListener(this.logsSubscriptionId);
      this.logsSubscriptionId = null;
    }
    logger.info({ strategy: this.strategyId }, "Copy trade stopped");
  }

  async onConfigUpdate(config: StrategyConfig): Promise<void> {
    this.cfg = config.config as unknown as CopyTradeConfig;
  }

  private async handleSwap(signature: string): Promise<void> {
    const connection = getConnection();
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx?.meta) return;

    const pre = tx.meta.preTokenBalances ?? [];
    const post = tx.meta.postTokenBalances ?? [];

    // Find balance changes for the target wallet
    const targetKey = this.cfg.target_wallet;
    const decreased = pre.filter(b =>
      b.owner === targetKey &&
      (post.find(p => p.mint === b.mint && p.owner === targetKey)?.uiTokenAmount.uiAmount ?? 0) < (b.uiTokenAmount.uiAmount ?? 0)
    );
    const increased = post.filter(b =>
      b.owner === targetKey &&
      (pre.find(p => p.mint === b.mint && p.owner === targetKey)?.uiTokenAmount.uiAmount ?? 0) < (b.uiTokenAmount.uiAmount ?? 0)
    );

    if (!decreased.length || !increased.length) return;

    const tokenIn = decreased[0].mint;
    const tokenOut = increased[0].mint;

    if (this.cfg.token_blacklist.includes(tokenOut)) {
      logger.debug({ tokenOut }, "CopyTrade: token in blacklist, skipping");
      return;
    }

    const priceIn = await getTokenPrice(tokenIn).catch(() => 0);
    const balanceDiff = (decreased[0].uiTokenAmount.uiAmount ?? 0) -
      (post.find(p => p.mint === tokenIn && p.owner === targetKey)?.uiTokenAmount.uiAmount ?? 0);
    const amountInUsd = Math.min(balanceDiff * priceIn, this.cfg.max_copy_size_usd);

    if (amountInUsd <= 0) return;

    await this.replicateSwap({ tokenIn, tokenOut, amountInUsd });
  }

  private async replicateSwap(swap: DetectedSwap): Promise<void> {
    const rejection = await riskManager.checkPreTrade({
      tradeAmountUsd: swap.amountInUsd,
      walletBalanceUsd: swap.amountInUsd * 10,
      strategyId: this.strategyId,
    });
    if (rejection) { logger.warn({ rejection }, "CopyTrade rejected"); return; }

    try {
      const keypair = await getKeypairForWallet(this.walletId, supabase, env.WALLET_ENCRYPTION_KEY);
      const fee = await getDynamicPriorityFee();
      const isUsdcIn = swap.tokenIn === MINTS.USDC;
      const amountLamports = BigInt(Math.floor(swap.amountInUsd * (isUsdcIn ? 1e6 : 1e9)));
      const currentPrice = await getTokenPrice(swap.tokenOut).catch(() => 0);

      const { txSignature, outAmount } = await executeSwap(
        { inputMint: swap.tokenIn, outputMint: swap.tokenOut, amountLamports },
        keypair, fee, sendAndConfirmTransaction
      );

      const tokensReceived = Number(outAmount) / 1e9;
      await insertPosition({
        strategyId: this.strategyId, walletId: this.walletId,
        tokenMint: swap.tokenOut, side: "spot",
        entryPrice: currentPrice, amountUsd: swap.amountInUsd,
        amountTokens: tokensReceived, txSignature,
      });

      notify.fill(swap.tokenOut.slice(0, 8) + "...", "copy buy", swap.amountInUsd, txSignature).catch(() => {});
      logger.info({ tokenOut: swap.tokenOut, amountInUsd: swap.amountInUsd }, "Copy trade replicated");
    } catch (err) {
      logger.error(err, "CopyTrade replicateSwap failed");
    }
  }
}
