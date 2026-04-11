import { supabase } from "./supabase.js";
import { HEARTBEAT_INTERVAL_MS } from "../config/constants.js";
import { logger } from "../core/logger.js";

export async function isBotRunning(): Promise<boolean> {
  const { data } = await supabase
    .from("bot_state")
    .select("is_running")
    .eq("id", 1)
    .single();
  return data?.is_running ?? false;
}

export async function setHeartbeat(activeStrategyCount: number): Promise<void> {
  await supabase
    .from("bot_state")
    .update({
      last_heartbeat: new Date().toISOString(),
      active_strategy_count: activeStrategyCount,
    })
    .eq("id", 1);
}

export function startHeartbeat(getActiveCount: () => number): ReturnType<typeof setInterval> {
  return setInterval(async () => {
    await setHeartbeat(getActiveCount()).catch((err: unknown) =>
      logger.warn(err, "Heartbeat failed")
    );
  }, HEARTBEAT_INTERVAL_MS);
}
