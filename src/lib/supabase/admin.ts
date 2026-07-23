import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { getSupabaseEnv } from "@/lib/supabase/env";

/** Service-role client for privileged reference verification writes. */
export function createAdminClient() {
  const env = getSupabaseEnv();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  if (!env || !serviceRole || serviceRole.includes("your-")) {
    return null;
  }

  return createClient<Database>(env.url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
