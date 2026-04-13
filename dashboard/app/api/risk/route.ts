import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: Request) {
  const supabase = getAdminClient();
  const body = await req.json();
  const { error } = await supabase
    .from("bot_state")
    .update({ risk_config: body })
    .eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
