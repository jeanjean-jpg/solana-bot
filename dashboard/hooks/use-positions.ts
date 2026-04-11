"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Position } from "@/lib/types";

export function usePositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const supabase = createClient();

  async function fetchPositions() {
    const { data } = await supabase
      .from("positions")
      .select("*")
      .order("opened_at", { ascending: false });
    if (data) setPositions(data);
  }

  useEffect(() => {
    fetchPositions();

    const channel = supabase
      .channel("positions_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "positions" }, () => {
        fetchPositions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { positions };
}
