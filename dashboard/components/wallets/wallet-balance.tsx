"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface TokenItem {
  mint: string;
  amount: number;
  priceUsd: number;
  valueUsd: number;
}

interface BalanceData {
  address: string;
  solBalance: number;
  solUsd: number;
  solPrice: number;
  tokens: TokenItem[];
  totalUsd: number;
}

const KNOWN_SYMBOLS: Record<string, string> = {
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm": "WIF",
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": "JUP",
};

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function WalletBalance({ walletId }: { walletId: string }) {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wallets/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId }),
      });
      if (!res.ok) {
        const e = await res.json() as { error: string };
        throw new Error(e.error);
      }
      setData(await res.json() as BalanceData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    if (!open && !data) load();
    setOpen(o => !o);
  }

  return (
    <div className="mt-2">
      <button
        onClick={toggle}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? "▲" : "▼"}
        {data
          ? <span className="text-green-400 font-mono">${fmt(data.totalUsd)} total</span>
          : "show balances"
        }
        {loading && <span className="animate-pulse">...</span>}
      </button>

      {open && (
        <div className="mt-2 rounded-md border border-border bg-muted/20 p-3 space-y-2">
          {error && <p className="text-xs text-red-400">{error}</p>}

          {data && (
            <>
              {/* SOL */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">SOL</Badge>
                  <span className="text-xs font-mono">{fmt(data.solBalance, 4)}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">${fmt(data.solUsd)}</span>
              </div>

              {/* Tokens */}
              {data.tokens.map(t => (
                <div key={t.mint} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {KNOWN_SYMBOLS[t.mint] ?? t.mint.slice(0, 4) + "…"}
                    </Badge>
                    <span className="text-xs font-mono">{fmt(t.amount, 4)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {t.valueUsd > 0 ? `$${fmt(t.valueUsd)}` : "—"}
                  </span>
                </div>
              ))}

              {/* Total */}
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-sm font-bold text-green-400 font-mono">${fmt(data.totalUsd)}</span>
              </div>

              <button
                onClick={load}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ↻ refresh
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
