"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StrategyCard } from "@/components/strategies/strategy-card";
import type { Strategy } from "@/lib/types";

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("strategies").select("*").then(({ data }) => {
      if (data) setStrategies(data as Strategy[]);
    });
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Strategies</h1>
        <p className="text-muted-foreground text-sm">Enable and configure your trading strategies</p>
      </div>
      <div className="space-y-4">
        {strategies.map((s) => <StrategyCard key={s.id} strategy={s} />)}
      </div>
    </div>
  );
}
