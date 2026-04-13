"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Position, StrategyId } from "@/lib/types";

const STRATEGY_LABELS: Record<StrategyId, string> = {
  dca: "DCA",
  swing: "Swing",
  scalping: "Scalp",
  sniping: "Snipe",
  copy_trade: "Copy",
  perps: "Perps",
};

interface Props {
  positions: Position[];
}

export function SpotPositions({ positions }: Props) {
  const spotPositions = positions.filter(p => p.side === "spot");

  if (!spotPositions.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Open Spot Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground italic">No open positions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Open Spot Positions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left pb-2 pr-3">Token</th>
                <th className="text-right pb-2 pr-3">Entry</th>
                <th className="text-right pb-2 pr-3">Size</th>
                <th className="text-right pb-2 pr-3">Strategy</th>
                <th className="text-left pb-2">Opened</th>
              </tr>
            </thead>
            <tbody>
              {spotPositions.map((pos) => (
                <tr key={pos.id} className="border-b border-border/50">
                  <td className="py-2 pr-3 font-medium">
                    {pos.token_symbol ?? pos.token_mint.slice(0, 8) + "..."}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">
                    ${pos.entry_price.toFixed(4)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">
                    ${pos.amount_usd.toFixed(2)}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <Badge variant="outline" className="text-xs">
                      {STRATEGY_LABELS[pos.strategy_id] ?? pos.strategy_id}
                    </Badge>
                  </td>
                  <td className="py-2 text-muted-foreground">
                    {new Date(pos.opened_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
