"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import type { Wallet } from "@/lib/types";
import { toast } from "sonner";

const MARKETS = ["SOL-PERP", "BTC-PERP", "ETH-PERP"];

interface Props { wallets: Wallet[] }

export function OpenPositionForm({ wallets }: Props) {
  const [market, setMarket] = useState("SOL-PERP");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [sizeUsd, setSizeUsd] = useState("");
  const [leverage, setLeverage] = useState(3);
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  // Approximate liquidation price (simplified)
  const approxLiqPrice = sizeUsd && leverage
    ? direction === "long"
      ? `~${(100 / leverage).toFixed(1)}% below entry`
      : `~${(100 / leverage).toFixed(1)}% above entry`
    : "—";

  async function handleOpen() {
    if (!walletId) { toast.error("Select a wallet"); return; }
    if (!sizeUsd || Number(sizeUsd) <= 0) { toast.error("Enter position size"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/perps/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market, direction, sizeUsd: Number(sizeUsd), leverage, walletId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Position queued — bot will execute shortly");
      setSizeUsd("");
    } catch {
      toast.error("Failed to queue position");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Open Perp Position</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {MARKETS.map(m => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                market === m
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {(["long", "short"] as const).map(d => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                direction === d
                  ? d === "long"
                    ? "border-green-500 bg-green-500/10 text-green-400"
                    : "border-red-500 bg-red-500/10 text-red-400"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {d === "long" ? "↑ Long" : "↓ Short"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Size (USD)</Label>
            <Input
              type="number" min={1} step={1} value={sizeUsd}
              onChange={e => setSizeUsd(e.target.value)}
              placeholder="100" className="h-9"
            />
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
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs">
            <Label className="text-muted-foreground">Leverage</Label>
            <span className="font-bold text-foreground">{leverage}×</span>
          </div>
          <input
            type="range" min={1} max={20} step={1} value={leverage}
            onChange={e => setLeverage(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1×</span><span>5×</span><span>10×</span><span>15×</span><span>20×</span>
          </div>
        </div>

        <div className="rounded-md bg-muted/40 px-3 py-2 text-xs flex justify-between">
          <span className="text-muted-foreground">Est. Liq. Price</span>
          <span className="text-orange-400">{approxLiqPrice}</span>
        </div>

        <Button
          onClick={handleOpen}
          disabled={submitting}
          className={`w-full ${direction === "long" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
        >
          {submitting ? "Queuing..." : `Open ${direction === "long" ? "Long" : "Short"} ${market}`}
        </Button>
      </CardContent>
    </Card>
  );
}
