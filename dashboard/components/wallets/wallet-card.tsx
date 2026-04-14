"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WalletBalance } from "./wallet-balance";
import type { Wallet } from "@/lib/types";

interface Props { wallet: Wallet; onRemove: () => void; }

export function WalletCard({ wallet, onRemove }: Props) {
  const address = wallet.public_key ?? wallet.cold_wallet_address;

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
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{wallet.label}</span>
              <Badge variant="outline" className="text-xs text-green-400 border-green-500">Active</Badge>
            </div>
            {address && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {address.slice(0, 8)}...{address.slice(-6)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Added {new Date(wallet.created_at).toLocaleDateString()}
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleRemove}>Remove</Button>
        </div>
        <WalletBalance walletId={wallet.id} />
      </CardContent>
    </Card>
  );
}
