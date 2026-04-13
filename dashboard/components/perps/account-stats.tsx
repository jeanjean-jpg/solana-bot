"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface AccountInfo {
  totalCollateralUsd: number;
  freeCollateralUsd: number;
  accountHealth: number;
}

export function AccountStats() {
  const [info, setInfo] = useState<AccountInfo | null>(null);

  useEffect(() => {
    fetch("/api/perps/account")
      .then(r => r.json())
      .then(data => setInfo(data as AccountInfo))
      .catch(() => {});
  }, []);

  if (!info) return null;

  const healthColor =
    info.accountHealth >= 80 ? "text-green-400" :
    info.accountHealth >= 50 ? "text-yellow-400" :
    "text-red-400";

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Total Collateral</p>
            <p className="text-lg font-bold font-mono">${info.totalCollateralUsd.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Free Collateral</p>
            <p className="text-lg font-bold font-mono">${info.freeCollateralUsd.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Account Health</p>
            <p className={`text-lg font-bold ${healthColor}`}>{info.accountHealth.toFixed(0)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
