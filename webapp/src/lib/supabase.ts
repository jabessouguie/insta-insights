import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Returns a server-side Supabase client using the service role key (bypasses RLS).
 * Returns null when SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars are not set.
 * User isolation is enforced at the API layer via session.user.id checks.
 */
export function getSupabase(): SupabaseClient | null {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return (_client ??= createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ));
}
