import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
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
