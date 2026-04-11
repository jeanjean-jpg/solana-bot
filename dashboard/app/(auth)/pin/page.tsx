"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hashPin, verifyPin, getPinHash, setPinHash } from "@/lib/pin";

export default function PinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [existingHash, setExistingHash] = useState<string | null>(null);

  useEffect(() => {
    setExistingHash(getPinHash());
  }, []);

  const isFirstTime = !existingHash;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isFirstTime) {
      if (pin.length < 4) { setError("PIN must be at least 4 digits"); return; }
      if (pin !== confirm) { setError("PINs do not match"); return; }
      const hash = await hashPin(pin);
      setPinHash(hash);
      document.cookie = "solbot_pin_verified=1; path=/; max-age=86400";
      router.push("/overview");
    } else {
      const valid = await verifyPin(pin, existingHash!);
      if (!valid) { setError("Incorrect PIN"); setPin(""); return; }
      document.cookie = "solbot_pin_verified=1; path=/; max-age=86400";
      router.push("/overview");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 rounded-2xl border border-border bg-card shadow-2xl">
        <h1 className="text-2xl font-bold text-center mb-2">
          {isFirstTime ? "Set Your PIN" : "Enter PIN"}
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {isFirstTime ? "Choose a PIN to protect your dashboard" : "SolBot Dashboard"}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            inputMode="numeric"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={8}
            className="text-center text-2xl tracking-widest"
          />
          {isFirstTime && (
            <Input
              type="password"
              inputMode="numeric"
              placeholder="Confirm PIN"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              maxLength={8}
              className="text-center text-2xl tracking-widest"
            />
          )}
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <Button type="submit" className="w-full">
            {isFirstTime ? "Set PIN" : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}
