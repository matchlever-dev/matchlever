import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";
import {
  isStaySignedInEnabled,
  withStaySignedInCookieOptions,
} from "@/lib/auth/stay-signed-in";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Cookie writes from Server Components are best-effort; middleware refreshes sessions.
 */
export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const cookieStore = await cookies();
  const staySignedIn = isStaySignedInEnabled(cookieStore);

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(
              name,
              value,
              withStaySignedInCookieOptions(staySignedIn, options)
            )
          );
        } catch {
          // Called from a Server Component where cookies are read-only.
          // middleware.ts is responsible for refreshing the session.
        }
      },
    },
  });
}
