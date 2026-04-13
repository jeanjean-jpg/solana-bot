import { createClient } from "@supabase/supabase-js";

/** Server-only admin client. Call inside route handlers, never at module level. */
export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
