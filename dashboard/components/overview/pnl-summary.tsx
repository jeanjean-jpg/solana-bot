"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TradePnl { pnl_usd: number | null; }

export function PnlSummary() {
  const [trades, setTrades] = useState<TradePnl[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    supabase
      .from("trades")
      .select("pnl_usd")
      .gte("closed_at", today.toISOString())
      .then(({ data }) => { if (data) setTrades(data); });
  }, []);

  const dailyPnl = trades.reduce((sum, t) => sum + (t.pnl_usd ?? 0), 0);
  const wins = trades.filter((t) => (t.pnl_usd ?? 0) > 0).length;
  const losses = trades.filter((t) => (t.pnl_usd ?? 0) < 0).length;

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: "Today's PnL", value: `${dailyPnl >= 0 ? "+" : ""}$${dailyPnl.toFixed(2)}`, positive: dailyPnl >= 0 },
        { label: "Wins Today", value: wins.toString(), positive: true },
        { label: "Losses Today", value: losses.toString(), positive: losses === 0 },
      ].map(({ label, value, positive }) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-bold", positive ? "text-green-400" : "text-red-400")}>{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
