"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SwapForm } from "@/components/spot/swap-form";
import { DcaPositions } from "@/components/spot/dca-positions";
import { SpotPositions } from "@/components/spot/spot-positions";
import type { Position, Wallet } from "@/lib/types";

export default function SpotPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("wallets").select("*").eq("is_active", true).then(({ data }) => {
      if (data) setWallets(data as Wallet[]);
    });

    supabase.from("positions").select("*").then(({ data }) => {
      if (data) setPositions(data as Position[]);
    });

    const channel = supabase
      .channel("spot-positions")
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
        <h1 className="text-2xl font-bold">Spot Trading</h1>
        <p className="text-muted-foreground text-sm">Manual swaps via Jupiter + DCA position management</p>
      </div>
      <SwapForm wallets={wallets} />
      <DcaPositions positions={positions} />
      <SpotPositions positions={positions} />
    </div>
  );
}
