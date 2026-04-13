"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Wallet } from "@/lib/types";
import { toast } from "sonner";

const POPULAR_TOKENS = [
  { symbol: "SOL", mint: "So11111111111111111111111111111111111111112" },
  { symbol: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  { symbol: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
  { symbol: "WIF", mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" },
  { symbol: "JUP", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
];

interface QuoteInfo {
  outAmount: string;
  priceImpactPct: string;
}

interface Props { wallets: Wallet[] }

export function SwapForm({ wallets }: Props) {
  const [inputMint, setInputMint] = useState(POPULAR_TOKENS[1].mint); // USDC
  const [outputMint, setOutputMint] = useState(POPULAR_TOKENS[0].mint); // SOL
  const [amountUsd, setAmountUsd] = useState("");
  const [slippageBps, setSlippageBps] = useState(50);
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");
  const [quote, setQuote] = useState<QuoteInfo | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!amountUsd || isNaN(Number(amountUsd))) { setQuote(null); return; }
    const timer = setTimeout(() => fetchQuote(), 600);
    return () => clearTimeout(timer);
  }, [inputMint, outputMint, amountUsd, slippageBps]);

  async function fetchQuote() {
    setQuoteLoading(true);
    try {
      const amountLamports = Math.floor(Number(amountUsd) * 1e6);
      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=${slippageBps}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json() as { outAmount: string; priceImpactPct: string };
      setQuote({ outAmount: data.outAmount, priceImpactPct: data.priceImpactPct });
    } catch {
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }

  async function handleSwap() {
    if (!walletId) { toast.error("Select a wallet"); return; }
    if (!amountUsd) { toast.error("Enter amount"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputMint, outputMint, amountUsd: Number(amountUsd), slippageBps, walletId }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Swap queued — bot will execute shortly");
      setAmountUsd("");
      setQuote(null);
    } catch {
      toast.error("Swap failed");
    } finally {
      setSubmitting(false);
    }
  }

  const outSymbol = POPULAR_TOKENS.find(t => t.mint === outputMint)?.symbol ?? "tokens";
  const outAmount = quote ? (Number(quote.outAmount) / 1e9).toFixed(6) : "—";
  const priceImpact = quote ? parseFloat(quote.priceImpactPct).toFixed(3) : "—";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Manual Swap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <select
              className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring h-9"
              value={inputMint}
              onChange={e => setInputMint(e.target.value)}
            >
              {POPULAR_TOKENS.map(t => <option key={t.mint} value={t.mint}>{t.symbol}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <select
              className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring h-9"
              value={outputMint}
              onChange={e => setOutputMint(e.target.value)}
            >
              {POPULAR_TOKENS.map(t => <option key={t.mint} value={t.mint}>{t.symbol}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Amount (USD)</Label>
            <Input
              type="number" min={0.01} step={0.01} value={amountUsd}
              onChange={e => setAmountUsd(e.target.value)}
              placeholder="0.00" className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Slippage</Label>
            <select
              className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring h-9"
              value={slippageBps}
              onChange={e => setSlippageBps(Number(e.target.value))}
            >
              <option value={50}>0.5%</option>
              <option value={100}>1%</option>
              <option value={200}>2%</option>
              <option value={500}>5%</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Wallet</Label>
          <select
            className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring h-9"
            value={walletId}
            onChange={e => setWalletId(e.target.value)}
          >
            {wallets.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
        </div>

        {quote && (
          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected output</span>
              <span className="text-foreground font-mono">{outAmount} {outSymbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price impact</span>
              <span className={parseFloat(priceImpact) > 1 ? "text-red-400" : "text-green-400"}>{priceImpact}%</span>
            </div>
          </div>
        )}
        {quoteLoading && <p className="text-xs text-muted-foreground">Getting quote...</p>}

        <Button onClick={handleSwap} disabled={submitting || !amountUsd} className="w-full">
          {submitting ? "Queuing..." : "Swap"}
        </Button>
      </CardContent>
    </Card>
  );
}
