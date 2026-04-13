"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Position } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  positions: Position[];
}

export function DcaPositions({ positions }: Props) {
  const dcaPositions = positions.filter(p => p.strategy_id === "dca");

  async function handleSellAll(strategyId: string) {
    try {
      const res = await fetch("/api/dca/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Sell All queued — bot will execute shortly");
    } catch {
      toast.error("Failed to queue sell");
    }
  }

  if (!dcaPositions.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">DCA Accumulator</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground italic">No active DCA positions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">DCA Accumulator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dcaPositions.map((pos) => {
          const meta = pos.metadata as Record<string, unknown>;
          const avgEntry = pos.entry_price;
          const totalUsd = pos.amount_usd;

          return (
            <div key={pos.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{pos.token_symbol ?? pos.token_mint.slice(0, 8) + "..."}</span>
                  <Badge variant="outline" className="text-xs text-blue-400 border-blue-500">DCA</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Avg entry: ${avgEntry.toFixed(4)} · Total: ${totalUsd.toFixed(2)}
                </div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleSellAll(pos.strategy_id)}
              >
                Sell All
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
