"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Position } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  positions: Position[];
}

export function PerpsPositions({ positions }: Props) {
  const perpPositions = positions.filter(p => p.side === "long" || p.side === "short");

  async function handleClose(pos: Position) {
    try {
      const res = await fetch("/api/perps/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId: pos.id, market: pos.token_symbol }),
      });
      if (!res.ok) throw new Error();
      toast.success("Close queued — bot will execute shortly");
    } catch {
      toast.error("Failed to queue close");
    }
  }

  if (!perpPositions.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Open Perp Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground italic">No open perp positions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Open Perp Positions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {perpPositions.map((pos) => {
            const isLong = pos.side === "long";
            const unrealizedPnl = (pos.metadata as Record<string, unknown>)?.unrealized_pnl_usd as number ?? null;

            return (
              <div key={pos.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{pos.token_symbol ?? pos.token_mint}</span>
                    <Badge
                      variant="outline"
                      className={isLong ? "text-green-400 border-green-500" : "text-red-400 border-red-500"}
                    >
                      {isLong ? "↑ Long" : "↓ Short"}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {pos.leverage}×
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    Entry: ${pos.entry_price.toFixed(4)} ·
                    Size: ${pos.amount_usd.toFixed(2)}
                    {unrealizedPnl != null && (
                      <span className={unrealizedPnl >= 0 ? " text-green-400" : " text-red-400"}>
                        {" "}· PnL: {unrealizedPnl >= 0 ? "+" : ""}{unrealizedPnl.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClose(pos)}
                  className="text-red-400 border-red-500 hover:bg-red-500/10"
                >
                  Close
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
