"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { Strategy, StrategyId } from "@/lib/types";

const STRATEGY_META: Record<StrategyId, { name: string; description: string; risk: string }> = {
  dca: { name: "DCA Accumulator", description: "Buy dips on a token, accumulate, sell at target", risk: "Low" },
  swing: { name: "Swing Trading", description: "EMA crossover + RSI signals for trend following", risk: "Medium" },
  scalping: { name: "Scalping", description: "Fast momentum trades on volume spikes", risk: "High" },
  sniping: { name: "Sniping", description: "New Raydium pool launches — buy before the crowd", risk: "Very High" },
  copy_trade: { name: "Copy Trading", description: "Mirror a target wallet's swaps in real time", risk: "Medium" },
  perps: { name: "Perps (Drift)", description: "Long/short perpetuals with configurable leverage", risk: "High" },
};

const RISK_COLOR: Record<string, string> = {
  "Low": "text-green-400 border-green-500",
  "Medium": "text-yellow-400 border-yellow-500",
  "High": "text-orange-400 border-orange-500",
  "Very High": "text-red-400 border-red-500",
};

interface Props { strategy: Strategy; }

export function StrategyCard({ strategy }: Props) {
  const [enabled, setEnabled] = useState(strategy.is_enabled);
  const meta = STRATEGY_META[strategy.id as StrategyId];
  const supabase = createClient();

  async function handleToggle(val: boolean) {
    setEnabled(val);
    await supabase.from("strategies").update({ is_enabled: val }).eq("id", strategy.id);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{meta.name}</CardTitle>
            <Badge variant="outline" className={`text-xs ${RISK_COLOR[meta.risk]}`}>{meta.risk} Risk</Badge>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>
        <p className="text-xs text-muted-foreground">{meta.description}</p>
      </CardHeader>
      <CardContent>
        {!enabled ? (
          <p className="text-xs text-muted-foreground italic">Enable this strategy to configure it</p>
        ) : (
          <p className="text-xs text-green-400">Strategy active — full config available in Plan B</p>
        )}
      </CardContent>
    </Card>
  );
}
