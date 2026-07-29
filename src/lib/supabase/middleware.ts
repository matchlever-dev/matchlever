import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";
import {
  isStaySignedInEnabled,
  STAY_SIGNED_IN_COOKIE,
  staySignedInCookieWriteOptions,
  withStaySignedInCookieOptions,
} from "@/lib/auth/stay-signed-in";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Refreshes the Auth session on each matched request.
 * Gates /dashboard (signed-in candidate), /admin (is_admin), and /superuser (is_superuser).
 */
function redirectToLogin(request: NextRequest, nextPath: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const needsCandidate = pathname.startsWith("/dashboard");
  const needsAdmin = pathname.startsWith("/admin");
  const needsSuperuser = pathname.startsWith("/superuser");
  const needsAuth = needsCandidate || needsAdmin || needsSuperuser;

  const env = getSupabaseEnv();
  if (!env) {
    // Local demo: allow portal UI without Supabase credentials.
    return supabaseResponse;
  }

  const staySignedIn = isStaySignedInEnabled({
    get: (name) => request.cookies.get(name),
  });

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
          supabaseResponse.cookies.set(
            name,
            value,
            withStaySignedInCookieOptions(staySignedIn, options)
          )
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

  if (!needsAuth) {
    return supabaseResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectToLogin(
      request,
      `${pathname}${request.nextUrl.search}`
    );
  }

  if (staySignedIn) {
    supabaseResponse.cookies.set(
      STAY_SIGNED_IN_COOKIE,
      "1",
      staySignedInCookieWriteOptions()
    );
  }

  if (needsAdmin || needsSuperuser) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin, is_superuser")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = Boolean(profile?.is_admin);
    const isSuperuser = Boolean(profile?.is_superuser);

    if (needsSuperuser && !isSuperuser) {
      return redirectToLogin(request, "/superuser");
    }
    if (needsAdmin && !isAdmin) {
      return redirectToLogin(request, "/admin");
    }
  }

  return supabaseResponse;
}
