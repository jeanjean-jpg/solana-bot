"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props { onAdded: () => void; }

export function AddWalletForm({ onAdded }: Props) {
  const [label, setLabel] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [coldAddress, setColdAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/wallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, privateKey, coldWalletAddress: coldAddress }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    setLabel(""); setPrivateKey(""); setColdAddress("");
    onAdded();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Add Trading Wallet</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Label</Label>
            <Input placeholder="e.g. DCA Wallet" value={label} onChange={(e) => setLabel(e.target.value)} required />
          </div>
          <div>
            <Label className="text-xs">Private Key (base58)</Label>
            <Input type="password" placeholder="Your wallet private key" value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} required />
            <p className="text-xs text-muted-foreground mt-1">⚠️ Use a dedicated trading wallet only. Never your main wallet.</p>
          </div>
          <div>
            <Label className="text-xs">Cold Wallet Address (for profit sweeps)</Label>
            <Input placeholder="Optional: destination for profit sweeps" value={coldAddress} onChange={(e) => setColdAddress(e.target.value)} />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving..." : "Add Wallet"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
