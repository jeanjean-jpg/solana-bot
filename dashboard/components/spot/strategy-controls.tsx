"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StrategyConfigPanel } from "@/components/strategies/strategy-config-panel";
import type { Strategy, StrategyId, Wallet } from "@/lib/types";
import { toast } from "sonner";

const SPOT_STRATEGIES: StrategyId[] = ["dca", "swing", "scalping", "sniping", "copy_trade"];

const STRATEGY_NAMES: Record<StrategyId, string> = {
  dca: "DCA Accumulator",
  swing: "Swing Trading",
  scalping: "Scalping",
  sniping: "Sniping",
  copy_trade: "Copy Trading",
  perps: "Perps (Drift)",
};

interface Props {
  strategies: Strategy[];
  wallets: Wallet[];
  onToggle: (id: string, enabled: boolean) => Promise<void>;
}

export function SpotStrategyControls({ strategies, wallets, onToggle }: Props) {
  const spotStrategies = strategies.filter(s => SPOT_STRATEGIES.includes(s.id as StrategyId));
  const [selectedId, setSelectedId] = useState<StrategyId | null>(null);
  const [configUpdated, setConfigUpdated] = useState<Strategy | null>(null);

  const selectedStrategy = configUpdated
    ?? spotStrategies.find(s => s.id === selectedId)
    ?? null;

  const runningCount = spotStrategies.filter(s => s.is_enabled).length;

  async function handleStart() {
    if (!selectedId) { toast.error("Select a strategy first"); return; }
    const s = spotStrategies.find(s => s.id === selectedId);
    if (!s?.wallet_id) { toast.error("Assign a wallet to this strategy first"); return; }
    await onToggle(selectedId, true);
    toast.success(`${STRATEGY_NAMES[selectedId]} started`);
  }

  async function handleStop() {
    if (!selectedId) { toast.error("Select a strategy first"); return; }
    await onToggle(selectedId, false);
    toast.success(`${STRATEGY_NAMES[selectedId]} stopped`);
  }

  async function handleStopAll() {
    for (const s of spotStrategies.filter(s => s.is_enabled)) {
      await onToggle(s.id, false);
    }
    toast.success("All spot strategies stopped");
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Spot Bot Controls</CardTitle>
            {runningCount > 0 && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500 text-xs">
                {runningCount} running
              </Badge>
            )}
          </div>
          {runningCount > 0 && (
            <Button size="sm" variant="destructive" onClick={handleStopAll}>
              Stop All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Running strategies pills */}
        {runningCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {spotStrategies.filter(s => s.is_enabled).map(s => (
              <div key={s.id} className="flex items-center gap-1 rounded-full bg-green-500/10 border border-green-500/40 px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-green-400">{STRATEGY_NAMES[s.id as StrategyId]}</span>
                <button
                  onClick={() => onToggle(s.id, false)}
                  className="ml-1 text-green-400/60 hover:text-red-400 text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Strategy selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-muted-foreground">Select strategy to configure & start</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {spotStrategies.map(s => {
              const isRunning = s.is_enabled;
              const isSelected = selectedId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedId(s.id as StrategyId);
                    setConfigUpdated(null);
                  }}
                  className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors text-left ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : isRunning
                      ? "border-green-500/50 bg-green-500/5 text-green-400"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
                    {STRATEGY_NAMES[s.id as StrategyId]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Config panel for selected strategy */}
        {selectedStrategy && (
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground mb-2">Configure {STRATEGY_NAMES[selectedStrategy.id as StrategyId]}</p>
            <StrategyConfigPanel
              strategy={selectedStrategy}
              wallets={wallets}
              onSaved={(updated) => setConfigUpdated(updated)}
            />
          </div>
        )}

        {/* Start / Stop buttons */}
        {selectedId && (
          <div className="flex gap-2">
            {!spotStrategies.find(s => s.id === selectedId)?.is_enabled ? (
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleStart}>
                ▶ Start {STRATEGY_NAMES[selectedId]}
              </Button>
            ) : (
              <Button className="flex-1" variant="destructive" onClick={handleStop}>
                ■ Stop {STRATEGY_NAMES[selectedId]}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
