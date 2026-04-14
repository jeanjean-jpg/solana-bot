"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StrategyConfigPanel } from "@/components/strategies/strategy-config-panel";
import type { Strategy, StrategyId, Wallet } from "@/lib/types";
import { toast } from "sonner";

const PERPS_STRATEGY_ID: StrategyId = "perps";
const PERPS_NAME = "Perps (Drift)";

interface Props {
  strategies: Strategy[];
  wallets: Wallet[];
  onToggle: (id: string, enabled: boolean) => Promise<void>;
}

export function PerpsControls({ strategies, wallets, onToggle }: Props) {
  const perps = strategies.find(s => s.id === PERPS_STRATEGY_ID) ?? null;
  const [configUpdated, setConfigUpdated] = useState<Strategy | null>(null);
  const [open, setOpen] = useState(false);

  const isRunning = perps?.is_enabled ?? false;
  const displayStrategy = configUpdated ?? perps;

  async function handleStart() {
    if (!perps?.wallet_id) {
      toast.error("Assign a wallet to the Perps strategy first");
      return;
    }
    await onToggle(PERPS_STRATEGY_ID, true);
    toast.success(`${PERPS_NAME} started`);
  }

  async function handleStop() {
    await onToggle(PERPS_STRATEGY_ID, false);
    toast.success(`${PERPS_NAME} stopped`);
  }

  if (!perps) {
    return (
      <Card className="border-primary/30">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Perps strategy not found in database.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Perps Bot Controls</CardTitle>
            {isRunning && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block mr-1" />
                running
              </Badge>
            )}
          </div>
          <button
            onClick={() => setOpen(o => !o)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {open ? "▲ hide config" : "▼ configure"}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet assignment + config panel */}
        {open && displayStrategy && (
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground mb-2">Configure {PERPS_NAME}</p>
            <StrategyConfigPanel
              strategy={displayStrategy}
              wallets={wallets}
              onSaved={(updated) => setConfigUpdated(updated)}
            />
          </div>
        )}

        {/* Wallet badge if assigned */}
        {perps.wallet_id && !open && (
          <p className="text-xs text-muted-foreground">
            Wallet:{" "}
            <span className="text-foreground font-mono">
              {wallets.find(w => w.id === perps.wallet_id)?.label ?? perps.wallet_id.slice(0, 8)}
            </span>
          </p>
        )}

        {/* Start / Stop */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleStart}>
              ▶ Start {PERPS_NAME}
            </Button>
          ) : (
            <Button className="flex-1" variant="destructive" onClick={handleStop}>
              ■ Stop {PERPS_NAME}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
