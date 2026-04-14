"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OpenPositionForm } from "@/components/perps/open-position-form";
import { PerpsPositions } from "@/components/perps/perps-positions";
import { AccountStats } from "@/components/perps/account-stats";
import { PerpsControls } from "@/components/perps/perps-controls";
import { useStrategies } from "@/hooks/use-strategies";
import type { Position, Wallet } from "@/lib/types";

export default function PerpsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const { strategies, toggleStrategy } = useStrategies();
  const supabase = createClient();

  useEffect(() => {
    supabase.from("wallets").select("*").eq("is_active", true).then(({ data }) => {
      if (data) setWallets(data as Wallet[]);
    });

    supabase.from("positions").select("*").then(({ data }) => {
      if (data) setPositions(data as Position[]);
    });

    const channel = supabase
      .channel("perps-positions")
      .on("postgres_changes", { event: "*", schema: "public", table: "positions" }, () => {
        supabase.from("positions").select("*").then(({ data }) => {
          if (data) setPositions(data as Position[]);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Perps Trading</h1>
        <p className="text-muted-foreground text-sm">Drift Protocol — Long & Short perpetuals</p>
      </div>
      <PerpsControls
        strategies={strategies}
        wallets={wallets}
        onToggle={toggleStrategy}
      />
      <AccountStats />
      <OpenPositionForm wallets={wallets} />
      <PerpsPositions positions={positions} />
    </div>
  );
}
