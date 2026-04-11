"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Wallet } from "@/lib/types";

interface Props { wallet: Wallet; onRemove: () => void; }

export function WalletCard({ wallet, onRemove }: Props) {
  async function handleRemove() {
    if (!confirm(`Remove wallet "${wallet.label}"?`)) return;
    await fetch("/api/wallets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: wallet.id }),
    });
    onRemove();
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-4 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{wallet.label}</span>
            <Badge variant="outline" className="text-xs text-green-400 border-green-500">Active</Badge>
          </div>
          {wallet.cold_wallet_address && (
            <p className="text-xs text-muted-foreground mt-1">
              Sweep → {wallet.cold_wallet_address.slice(0, 8)}...{wallet.cold_wallet_address.slice(-4)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Added {new Date(wallet.created_at).toLocaleDateString()}</p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleRemove}>Remove</Button>
      </CardContent>
    </Card>
  );
}
