"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Strategy } from "@/lib/types";

export function useStrategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const supabase = createClient();

  const refetch = useCallback(async () => {
    const { data } = await supabase.from("strategies").select("*");
    if (data) setStrategies(data as Strategy[]);
  }, []);

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel("strategies-hook")
      .on("postgres_changes", { event: "*", schema: "public", table: "strategies" }, refetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  async function toggleStrategy(id: string, enabled: boolean) {
    // Optimistic update — reflect change immediately in UI
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, is_enabled: enabled } : s));
    await fetch(`/api/strategies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_enabled: enabled }),
    });
    // realtime will sync from server to confirm
  }

  async function saveStrategyConfig(id: string, config: Record<string, unknown>, walletId: string | null) {
    // Optimistic update for wallet assignment
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, config, wallet_id: walletId } : s));
    await fetch(`/api/strategies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config, wallet_id: walletId }),
    });
  }

  return { strategies, refetch, toggleStrategy, saveStrategyConfig };
}
