import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Manual swap endpoint.
 * Writes a swap intent to bot_state.manual_trigger — the bot engine picks it up and executes.
 * Private keys never leave the bot engine.
 */
export async function POST(req: Request) {
  const supabase = getAdminClient();
  const body = await req.json() as {
    inputMint: string;
    outputMint: string;
    amountUsd: number;
    slippageBps: number;
    walletId: string;
  };

  const { error } = await supabase
    .from("bot_state")
    .update({
      manual_trigger: {
        action: "manual_swap",
        inputMint: body.inputMint,
        outputMint: body.outputMint,
        amountUsd: body.amountUsd,
        slippageBps: body.slippageBps,
        walletId: body.walletId,
        requestedAt: new Date().toISOString(),
      },
    })
    .eq("id", 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: "Swap queued — bot will execute shortly" });
}
