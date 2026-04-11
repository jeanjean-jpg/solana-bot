"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BotState } from "@/lib/types";

export function useBotState() {
  const [botState, setBotState] = useState<BotState | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("bot_state")
      .select("*")
      .single()
      .then(({ data }) => { if (data) setBotState(data); });

    const channel = supabase
      .channel("bot_state_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bot_state" }, (payload) => {
        setBotState(payload.new as BotState);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleBot = useCallback(async () => {
    if (!botState) return;
    await supabase
      .from("bot_state")
      .update({ is_running: !botState.is_running })
      .eq("id", 1);
  }, [botState]);

  return { botState, toggleBot };
}
