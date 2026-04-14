import { z } from "zod";
import { config } from "dotenv";
config();

const envSchema = z.object({
  HELIUS_API_KEY: z.string().min(1),
  HELIUS_RPC_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WALLET_ENCRYPTION_KEY: z.string().min(32).max(32),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  JITO_BLOCK_ENGINE_URL: z.string().url().default("https://mainnet.block-engine.jito.wtf"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse(process.env);
