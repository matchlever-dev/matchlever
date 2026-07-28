import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import {
  isStaySignedInEnabled,
  withStaySignedInCookieOptions,
} from "@/lib/auth/stay-signed-in";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Supabase client for Client Components (browser).
 * Uses a singleton pattern internally via createBrowserClient.
 */
export function createClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const staySignedIn =
    typeof document !== "undefined" &&
    isStaySignedInEnabled(document.cookie);

  return createBrowserClient<Database>(env.url, env.anonKey, {
    cookieOptions: withStaySignedInCookieOptions(staySignedIn),
  });
}
