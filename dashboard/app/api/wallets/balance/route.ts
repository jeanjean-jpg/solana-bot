import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
const LAMPORTS_PER_SOL = 1_000_000_000;
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const JUPITER_PRICE_URL = "https://api.jup.ag/price/v2";

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(HELIUS_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`Helius RPC error: ${res.status}`);
  return res.json() as Promise<{ result: unknown }>;
}

async function getTokenPrices(mints: string[]): Promise<Record<string, number>> {
  if (!mints.length) return {};
  const res = await fetch(`${JUPITER_PRICE_URL}?ids=${mints.join(",")}`);
  if (!res.ok) return {};
  const json = await res.json() as { data: Record<string, { price: number }> };
  const out: Record<string, number> = {};
  for (const [mint, info] of Object.entries(json.data ?? {})) {
    out[mint] = info.price;
  }
  return out;
}

export async function POST(req: Request) {
  try {
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
        tokenAmount: { uiAmount: number };
      } } } };
    }> })?.value ?? []);

    const tokens = tokenAccounts
      .map(a => ({
        mint: a.account.data.parsed.info.mint,
        amount: a.account.data.parsed.info.tokenAmount.uiAmount ?? 0,
      }))
      .filter(t => t.amount > 0);

    // Prices
    const SOL_MINT = "So11111111111111111111111111111111111111112";
    const allMints = [SOL_MINT, ...tokens.map(t => t.mint)];
    const prices = await getTokenPrices(allMints);

    const solPrice = prices[SOL_MINT] ?? 0;
    const solUsd = solBalance * solPrice;

    const tokenItems = tokens.map(t => ({
      mint: t.mint,
      amount: t.amount,
      priceUsd: prices[t.mint] ?? 0,
      valueUsd: t.amount * (prices[t.mint] ?? 0),
    })).sort((a, b) => b.valueUsd - a.valueUsd).slice(0, 8);

    const totalUsd = solUsd + tokenItems.reduce((s, t) => s + t.valueUsd, 0);

    return NextResponse.json({ address, solBalance, solUsd, solPrice, tokens: tokenItems, totalUsd });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
