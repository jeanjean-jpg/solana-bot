"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { StrategyConfigPanel } from "./strategy-config-panel";
import type { Strategy, StrategyId, Wallet } from "@/lib/types";

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

interface Props {
  strategy: Strategy;
  wallets: Wallet[];
}

export function StrategyCard({ strategy, wallets }: Props) {
  const [strategyState, setStrategyState] = useState(strategy);
  const [enabled, setEnabled] = useState(strategy.is_enabled);
  const [expanded, setExpanded] = useState(false);
  const meta = STRATEGY_META[strategy.id as StrategyId];
  const supabase = createClient();

  async function handleToggle(val: boolean) {
    setEnabled(val);
    await supabase.from("strategies").update({ is_enabled: val }).eq("id", strategy.id);
  }

  const assignedWallet = wallets.find(w => w.id === strategyState.wallet_id);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpanded(e => !e)}>
            <CardTitle className="text-base">{meta.name}</CardTitle>
            <Badge variant="outline" className={`text-xs ${RISK_COLOR[meta.risk]}`}>{meta.risk} Risk</Badge>
            {assignedWallet && (
              <Badge variant="outline" className="text-xs text-blue-400 border-blue-500">
                {assignedWallet.label}
              </Badge>
            )}
            {enabled && (
              <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500">
                Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? "▲ hide" : "▼ config"}
            </button>
            <Switch checked={enabled} onCheckedChange={handleToggle} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{meta.description}</p>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <StrategyConfigPanel
            strategy={strategyState}
            wallets={wallets}
            onSaved={setStrategyState}
          />
        </CardContent>
      )}
    </Card>
  );
}
