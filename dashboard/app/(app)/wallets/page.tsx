"use client";

import { useWallets } from "@/hooks/use-wallets";
import { AddWalletForm } from "@/components/wallets/add-wallet-form";
import { WalletCard } from "@/components/wallets/wallet-card";

export default function WalletsPage() {
  const { wallets, refetch } = useWallets();
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Wallets</h1>
        <p className="text-muted-foreground text-sm">Manage your encrypted trading wallets</p>
      </div>
      <AddWalletForm onAdded={refetch} />
      <div className="space-y-3">
        {wallets.map((w) => <WalletCard key={w.id} wallet={w} onRemove={refetch} />)}
      </div>
    </div>
  );
}
