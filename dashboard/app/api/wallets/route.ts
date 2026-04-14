import { NextRequest, NextResponse } from "next/server";
import { createCipheriv, randomBytes } from "crypto";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { getAdminClient } from "@/lib/supabase/admin";

/** AES-256-CBC encryption matching the bot's decryptKey() in bot/src/core/wallet.ts */
function encryptKey(privateKeyBase58: string, encryptionKey: string): string {
  const key = Buffer.from(encryptionKey.slice(0, 32).padEnd(32, "0"), "utf-8");
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKeyBase58, "utf-8"),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("base64");
}

function derivePublicKey(privateKeyBase58: string): string {
  const secretKey = bs58.decode(privateKeyBase58);
  return Keypair.fromSecretKey(secretKey).publicKey.toBase58();
}

export async function POST(req: NextRequest) {
  const { label, privateKey, coldWalletAddress } = await req.json();
  if (!label || !privateKey) {
    return NextResponse.json({ error: "label and privateKey required" }, { status: 400 });
  }
  const encryptionKey = process.env.WALLET_ENCRYPTION_KEY;
  if (!encryptionKey) return NextResponse.json({ error: "encryption key not configured" }, { status: 500 });

  let publicKey: string;
  try {
    publicKey = derivePublicKey(privateKey);
  } catch {
    return NextResponse.json({ error: "Invalid private key format" }, { status: 400 });
  }

  const encrypted = encryptKey(privateKey, encryptionKey);
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("wallets")
    .insert({
      label,
      encrypted_private_key: encrypted,
      public_key: publicKey,
      cold_wallet_address: coldWalletAddress || publicKey,
    })
    .select("id, label, public_key, cold_wallet_address, is_active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const supabase = getAdminClient();
  await supabase.from("wallets").update({ is_active: false }).eq("id", id);
  return NextResponse.json({ ok: true });
}
