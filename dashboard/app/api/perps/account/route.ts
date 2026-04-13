import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Returns Drift account stats from bot_state.risk_config
 * The bot engine syncs these periodically.
 */
export async function GET() {
  const { data, error } = await supabase
    .from("bot_state")
    .select("risk_config")
    .eq("id", 1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rc = data?.risk_config as Record<string, unknown> | null;
  return NextResponse.json({
    totalCollateralUsd: rc?.drift_total_collateral ?? 0,
    freeCollateralUsd: rc?.drift_free_collateral ?? 0,
    accountHealth: rc?.drift_account_health ?? 100,
  });
}
