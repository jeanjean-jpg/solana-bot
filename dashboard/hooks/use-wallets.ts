"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Wallet } from "@/lib/types";

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const supabase = createClient();

  async function refetch() {
    const { data } = await supabase
      .from("wallets")
      .select("id, label, cold_wallet_address, is_active, created_at")
      .eq("is_active", true)
      .order("created_at");
    if (data) setWallets(data);
  }

  useEffect(() => { refetch(); }, []);

  return { wallets, refetch };
}
