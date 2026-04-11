import { VersionedTransaction } from "@solana/web3.js";
import type { Keypair } from "@solana/web3.js";
import { JUPITER_API_URL, DEFAULT_SLIPPAGE_BPS } from "../config/constants.js";
import { logger } from "../core/logger.js";

export interface SwapParams {
  inputMint: string;
  outputMint: string;
  amountLamports: bigint;
  slippageBps?: number;
}

export interface QuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: unknown[];
}

export function buildSwapParams(params: SwapParams) {
  return {
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amountLamports.toString(),
    slippageBps: params.slippageBps ?? DEFAULT_SLIPPAGE_BPS,
    onlyDirectRoutes: false,
  };
}

export async function getQuote(params: SwapParams): Promise<QuoteResponse> {
  const p = buildSwapParams(params);
  const url = new URL(`${JUPITER_API_URL}/quote`);
  url.searchParams.set("inputMint", p.inputMint);
  url.searchParams.set("outputMint", p.outputMint);
  url.searchParams.set("amount", p.amount);
  url.searchParams.set("slippageBps", p.slippageBps.toString());
  url.searchParams.set("onlyDirectRoutes", String(p.onlyDirectRoutes));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Jupiter quote failed: ${res.status} ${await res.text()}`);
  const quote = await res.json() as QuoteResponse;
  logger.debug({ in: quote.inAmount, out: quote.outAmount }, "Jupiter quote");
  return quote;
}

export async function buildSwapTransaction(
  quote: QuoteResponse,
  userPublicKey: string,
  priorityFeeLamports: number
): Promise<VersionedTransaction> {
  const res = await fetch(`${JUPITER_API_URL}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: priorityFeeLamports,
    }),
  });
  if (!res.ok) throw new Error(`Jupiter swap build failed: ${res.status} ${await res.text()}`);
  const { swapTransaction } = await res.json() as { swapTransaction: string };
  return VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));
}

export async function executeSwap(
  params: SwapParams,
  keypair: Keypair,
  priorityFeeLamports: number,
  sendAndConfirm: (tx: VersionedTransaction) => Promise<string>
): Promise<{ txSignature: string; outAmount: string }> {
  const quote = await getQuote(params);
  const tx = await buildSwapTransaction(quote, keypair.publicKey.toBase58(), priorityFeeLamports);
  tx.sign([keypair]);
  const txSignature = await sendAndConfirm(tx);
  logger.info({ txSignature, out: quote.outAmount }, "Swap executed");
  return { txSignature, outAmount: quote.outAmount };
}
