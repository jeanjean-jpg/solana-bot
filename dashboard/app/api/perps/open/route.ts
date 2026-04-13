import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.json() as {
    market: string;
    direction: "long" | "short";
    sizeUsd: number;
    leverage: number;
    walletId: string;
  };

  const { error } = await supabase
    .from("bot_state")
    .update({
      manual_trigger: {
        action: "open_perp",
        strategy_id: "perps",
        market: body.market,
        direction: body.direction,
        sizeUsd: body.sizeUsd,
        leverage: body.leverage,
        walletId: body.walletId,
        requestedAt: new Date().toISOString(),
      },
    })
    .eq("id", 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: "Position open queued — bot will execute shortly" });
}
