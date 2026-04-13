import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as {
    wallet_id?: string | null;
    config?: Record<string, unknown>;
    is_enabled?: boolean;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.wallet_id !== undefined) updates.wallet_id = body.wallet_id;
  if (body.config !== undefined) updates.config = body.config;
  if (body.is_enabled !== undefined) updates.is_enabled = body.is_enabled;

  const { data, error } = await supabase
    .from("strategies")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
