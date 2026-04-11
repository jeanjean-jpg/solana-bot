import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { logger } from "./logger.js";

const ALGORITHM = "aes-256-cbc";

export function encryptKey(privateKeyBase58: string, encryptionKey: string): string {
  const key = Buffer.from(encryptionKey.slice(0, 32).padEnd(32, "0"), "utf-8");
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKeyBase58, "utf-8"),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("base64");
}

export function decryptKey(encryptedValue: string, encryptionKey: string): string {
  const colonIndex = encryptedValue.indexOf(":");
  const ivHex = encryptedValue.slice(0, colonIndex);
  const encryptedBase64 = encryptedValue.slice(colonIndex + 1);
  const key = Buffer.from(encryptionKey.slice(0, 32).padEnd(32, "0"), "utf-8");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedBase64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf-8");
}

export function loadKeypair(encryptedPrivateKey: string, encryptionKey: string): Keypair {
  const privateKeyBase58 = decryptKey(encryptedPrivateKey, encryptionKey);
  // @ts-ignore
  const secretKey = bs58.decode(privateKeyBase58);
  return Keypair.fromSecretKey(secretKey);
}

export async function getKeypairForWallet(
  walletId: string,
  supabaseClient: { from: (t: string) => any },
  encryptionKey: string
): Promise<Keypair> {
  const { data, error } = await supabaseClient
    .from("wallets")
    .select("encrypted_private_key")
    .eq("id", walletId)
    .eq("is_active", true)
    .single();

  if (error || !data) throw new Error(`Wallet ${walletId} not found or inactive`);
  logger.debug({ walletId }, "Keypair loaded");
  return loadKeypair(data.encrypted_private_key, encryptionKey);
}
