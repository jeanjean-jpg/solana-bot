import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = getAdminClient();
  const { positionId, market } = await req.json() as { positionId: string; market: string };

  const { error } = await supabase
    .from("bot_state")
    .update({
      manual_trigger: {
        action: "close_perp",
        strategy_id: "perps",
        positionId,
        market,
        requestedAt: new Date().toISOString(),
      },
    })
    .eq("id", 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
