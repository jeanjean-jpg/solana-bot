import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function obfuscate(text: string, key: string): string {
  const keyBytes = Buffer.from(key.padEnd(32).slice(0, 32), "utf-8");
  const textBytes = Buffer.from(text, "utf-8");
  const result = Buffer.alloc(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return result.toString("base64");
}

export async function POST(req: NextRequest) {
  const { label, privateKey, coldWalletAddress } = await req.json();
  if (!label || !privateKey) {
    return NextResponse.json({ error: "label and privateKey required" }, { status: 400 });
  }
  const encryptionKey = process.env.WALLET_ENCRYPTION_KEY;
  if (!encryptionKey) return NextResponse.json({ error: "encryption key not configured" }, { status: 500 });

  const encrypted = obfuscate(privateKey, encryptionKey);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wallets")
    .insert({ label, encrypted_private_key: encrypted, cold_wallet_address: coldWalletAddress || null })
    .select("id, label, cold_wallet_address, is_active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const supabase = await createClient();
  await supabase.from("wallets").update({ is_active: false }).eq("id", id);
  return NextResponse.json({ ok: true });
}
