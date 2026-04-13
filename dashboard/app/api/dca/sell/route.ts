import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = getAdminClient();
  const { strategyId } = await req.json() as { strategyId: string };

  // Signal the bot to sell the DCA position for this strategy
  const { error } = await supabase
    .from("bot_state")
    .update({
      manual_trigger: {
        action: "dca_sell_all",
        strategy_id: strategyId,
        requestedAt: new Date().toISOString(),
      },
    })
    .eq("id", 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
