/**
 * Server-only Supabase admin client using the service_role key.
 * Bypasses RLS — use only in server actions after app-level permission checks.
 *
 * Never expose this client or the service_role key to the client/browser.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

let cachedAdminClient: ReturnType<typeof createClient<Database>> | null = null;

export function createServiceRoleSupabaseClient() {
  if (cachedAdminClient) return cachedAdminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL environment variables."
    );
  }

  cachedAdminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
}
