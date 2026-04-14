import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
const LAMPORTS_PER_SOL = 1_000_000_000;
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(HELIUS_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return res.json() as Promise<{ result: unknown }>;
}

async function getTokenPrices(mints: string[]): Promise<Record<string, number>> {
  if (!mints.length) return {};
  const res = await fetch(`https://price.jup.ag/v4/price?ids=${mints.join(",")}`);
  const json = await res.json() as { data: Record<string, { price: number }> };
  const out: Record<string, number> = {};
  for (const [mint, info] of Object.entries(json.data ?? {})) {
    out[mint] = info.price;
  }
  return out;
}

export async function POST(req: Request) {
  const { walletId } = await req.json() as { walletId: string };
  const supabase = getAdminClient();

  const { data: wallet } = await supabase
    .from("wallets")
    .select("public_key, cold_wallet_address")
    .eq("id", walletId)
    .single();

  const address = wallet?.public_key ?? wallet?.cold_wallet_address;
  if (!address) return NextResponse.json({ error: "No public key for this wallet" }, { status: 400 });

  // SOL balance
  const balRes = await rpc("getBalance", [address]);
  const solBalance = ((balRes.result as { value: number })?.value ?? 0) / LAMPORTS_PER_SOL;

  // Token accounts
  const tokRes = await rpc("getTokenAccountsByOwner", [
    address,
    { programId: TOKEN_PROGRAM_ID },
    { encoding: "jsonParsed" },
  ]);

  const tokenAccounts = ((tokRes.result as { value: Array<{
    account: { data: { parsed: { info: {
      mint: string;
      tokenAmount: { uiAmount: number; decimals: number };
    } } } };
  }> })?.value ?? []);

  const tokens = tokenAccounts
    .map(a => ({
      mint: a.account.data.parsed.info.mint,
      amount: a.account.data.parsed.info.tokenAmount.uiAmount ?? 0,
    }))
    .filter(t => t.amount > 0);

  // Prices in USD
  const solPrice = (await getTokenPrices(["So11111111111111111111111111111111111111112"]))
    ["So11111111111111111111111111111111111111112"] ?? 0;
  const tokenPrices = await getTokenPrices(tokens.map(t => t.mint));

  const solUsd = solBalance * solPrice;
  const tokenItems = tokens.map(t => ({
    mint: t.mint,
    amount: t.amount,
    priceUsd: tokenPrices[t.mint] ?? 0,
    valueUsd: t.amount * (tokenPrices[t.mint] ?? 0),
  })).sort((a, b) => b.valueUsd - a.valueUsd).slice(0, 8); // top 8 by value

  const totalUsd = solUsd + tokenItems.reduce((s, t) => s + t.valueUsd, 0);

  return NextResponse.json({
    address,
    solBalance,
    solUsd,
    solPrice,
    tokens: tokenItems,
    totalUsd,
  });
}
