import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Refreshes the Auth session on each matched request.
 * Gates /admin (is_admin) and /superuser (is_superuser) portals.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const needsAdmin = pathname.startsWith("/admin");
  const needsSuperuser = pathname.startsWith("/superuser");

  const env = getSupabaseEnv();
  if (!env) {
    // Local demo: allow portal UI without Supabase credentials.
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value)
        );
      },
    },
  });

  try {
    // Do not run logic between createServerClient and getClaims().
    await supabase.auth.getClaims();
  } catch (error) {
    console.warn("[supabase middleware] session refresh skipped:", error);
  }

  if (needsAdmin || needsSuperuser) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return redirectHome(request);
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin, is_superuser")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = Boolean(profile?.is_admin || profile?.is_superuser);
    const isSuperuser = Boolean(profile?.is_superuser);

    if (needsSuperuser && !isSuperuser) {
      return redirectHome(request);
    }
    if (needsAdmin && !isAdmin) {
      return redirectHome(request);
    }
  }

  return supabaseResponse;
}

function redirectHome(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("error", "unauthorized");
  return NextResponse.redirect(url);
}
