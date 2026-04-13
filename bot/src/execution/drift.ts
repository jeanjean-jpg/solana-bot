/**
 * Drift Protocol execution module.
 * Wraps @drift-labs/sdk for opening/closing perpetual positions.
 *
 * Market indices (mainnet):
 *   SOL-PERP = 0, BTC-PERP = 1, ETH-PERP = 2
 */
import {
  DriftClient,
  BN,
  PositionDirection,
  BASE_PRECISION,
  QUOTE_PRECISION,
  convertToNumber,
} from "@drift-labs/sdk";
import { type Keypair, PublicKey } from "@solana/web3.js";
// Use any for Connection to avoid dual-declaration conflict with Drift's bundled @solana/web3.js
type Connection = any;
import { logger } from "../core/logger.js";

export type PerpMarketSymbol = "SOL-PERP" | "BTC-PERP" | "ETH-PERP";

export const DRIFT_MARKETS: Record<string, number> = {
  "SOL-PERP": 0,
  "BTC-PERP": 1,
  "ETH-PERP": 2,
};

export interface OpenPerpParams {
  keypair: Keypair;
  connection: Connection;
  market: PerpMarketSymbol;
  direction: "long" | "short";
  usdSize: number;
  leverage: number;
  takeProfitPct?: number;
  stopLossPct?: number;
}

export interface DriftAccountInfo {
  totalCollateralUsd: number;
  freeCollateralUsd: number;
  accountHealth: number;
}

export interface DriftPositionInfo {
  marketIndex: number;
  market: string;
  direction: "long" | "short";
  sizeUsd: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnlUsd: number;
}

let driftClientInstance: DriftClient | null = null;
let currentPubkey: string | null = null;

async function getDriftClient(keypair: Keypair, connection: Connection): Promise<DriftClient> {
  if (driftClientInstance && currentPubkey === keypair.publicKey.toBase58()) {
    return driftClientInstance;
  }

  if (driftClientInstance) {
    await driftClientInstance.unsubscribe().catch(() => {});
  }

  const wallet = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: any) => { tx.sign([keypair]); return tx; },
    signAllTransactions: async (txs: any[]) => { txs.forEach(tx => tx.sign([keypair])); return txs; },
  };

  driftClientInstance = new DriftClient({
    connection,
    wallet,
    programID: new PublicKey("dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"),
    env: "mainnet-beta",
    accountSubscription: { type: "websocket" },
  });

  await driftClientInstance.subscribe();
  currentPubkey = keypair.publicKey.toBase58();
  logger.info({ pubkey: currentPubkey }, "Drift client initialized");
  return driftClientInstance;
}

export async function openPerpPosition(params: OpenPerpParams): Promise<string> {
  const marketIndex = DRIFT_MARKETS[params.market];
  if (marketIndex === undefined) throw new Error(`Unknown Drift market: ${params.market}`);

  const client = await getDriftClient(params.keypair, params.connection);
  const direction = params.direction === "long" ? PositionDirection.LONG : PositionDirection.SHORT;

  const marketAccount = client.getPerpMarketAccount(marketIndex);
  if (!marketAccount) throw new Error(`Drift market account not found: ${params.market}`);

  const markPrice = convertToNumber(marketAccount.amm.lastMarkPriceTwap, QUOTE_PRECISION);
  const baseAmount = (params.usdSize * params.leverage) / markPrice;
  const baseAssetAmount = new BN(Math.floor(baseAmount * BASE_PRECISION.toNumber()));

  const txSig = await client.openPosition(direction, baseAssetAmount, marketIndex);
  logger.info({ market: params.market, direction: params.direction, usdSize: params.usdSize, txSig }, "Drift position opened");
  return txSig;
}

export async function closePerpPosition(
  keypair: Keypair,
  connection: Connection,
  market: PerpMarketSymbol
): Promise<string> {
  const marketIndex = DRIFT_MARKETS[market];
  if (marketIndex === undefined) throw new Error(`Unknown Drift market: ${market}`);

  const client = await getDriftClient(keypair, connection);
  const txSig = await client.closePosition(marketIndex);
  logger.info({ market, txSig }, "Drift position closed");
  return txSig;
}

export async function getDriftAccountInfo(
  keypair: Keypair,
  connection: Connection
): Promise<DriftAccountInfo> {
  const client = await getDriftClient(keypair, connection);
  const user = client.getUser();
  const totalCollateral = convertToNumber(user.getTotalCollateral(), QUOTE_PRECISION);
  const freeCollateral = convertToNumber(user.getFreeCollateral(), QUOTE_PRECISION);
  const marginRatio = convertToNumber(user.getMarginRatio(), new BN(10_000));
  const health = Math.min(100, Math.max(0, marginRatio - 100));
  return { totalCollateralUsd: totalCollateral, freeCollateralUsd: freeCollateral, accountHealth: health };
}

export async function getDriftOpenPositions(
  keypair: Keypair,
  connection: Connection
): Promise<DriftPositionInfo[]> {
  const client = await getDriftClient(keypair, connection);
  const user = client.getUser();
  const results: DriftPositionInfo[] = [];

  for (const [market, marketIndex] of Object.entries(DRIFT_MARKETS)) {
    const pos = user.getPerpPosition(marketIndex);
    if (!pos || pos.baseAssetAmount.isZero()) continue;

    const marketAccount = client.getPerpMarketAccount(marketIndex)!;
    const markPrice = convertToNumber(marketAccount.amm.lastMarkPriceTwap, QUOTE_PRECISION);
    const baseSize = Math.abs(convertToNumber(pos.baseAssetAmount, BASE_PRECISION));
    const entryPrice = baseSize > 0
      ? Math.abs(convertToNumber(pos.quoteEntryAmount, QUOTE_PRECISION)) / baseSize
      : 0;
    const sizeUsd = baseSize * markPrice;
    const unrealizedPnlUsd = convertToNumber(
      user.getUnrealizedPNL(true, marketIndex),
      QUOTE_PRECISION
    );

    results.push({
      marketIndex,
      market,
      direction: pos.baseAssetAmount.isNeg() ? "short" : "long",
      sizeUsd,
      entryPrice,
      markPrice,
      unrealizedPnlUsd,
    });
  }

  return results;
}
