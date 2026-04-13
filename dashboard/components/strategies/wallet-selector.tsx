"use client";

import type { Wallet } from "@/lib/types";

interface Props {
  wallets: Wallet[];
  value: string | null;
  onChange: (walletId: string | null) => void;
}

export function WalletSelector({ wallets, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">Wallet</label>
      <select
        className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">— select wallet —</option>
        {wallets.map((w) => (
          <option key={w.id} value={w.id}>
            {w.label}
          </option>
        ))}
      </select>
    </div>
  );
}
