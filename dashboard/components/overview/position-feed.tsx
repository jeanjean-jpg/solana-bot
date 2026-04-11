"use client";

import { usePositions } from "@/hooks/use-positions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PositionFeed() {
  const { positions } = usePositions();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Open Positions ({positions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {positions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No open positions</p>
        ) : (
          <div className="space-y-3">
            {positions.map((pos) => (
              <div key={pos.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{pos.token_symbol ?? pos.token_mint.slice(0, 6)}</span>
                    <Badge variant="outline" className={cn("text-xs", pos.side === "long" ? "text-green-400 border-green-500" : pos.side === "short" ? "text-red-400 border-red-500" : "text-blue-400 border-blue-500")}>
                      {pos.side.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-muted-foreground">{pos.strategy_id}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Entry: ${pos.entry_price.toFixed(4)} · Size: ${pos.amount_usd.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{new Date(pos.opened_at).toLocaleTimeString()}</p>
                  {pos.leverage > 1 && <p className="text-xs text-yellow-400">{pos.leverage}x</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
