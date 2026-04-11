import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    // Lazy import to avoid crashing at module-load time in test environments
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { env } = require("../config/env.js") as { env: { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string } };
    _client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

/** Convenience proxy — use `supabase.from(...)` just like before. */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseClient() as unknown as Record<string, unknown>)[prop as string];
  },
});
