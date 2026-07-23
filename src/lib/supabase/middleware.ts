import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

function hasConfiguredSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !key) return false;
  if (url.includes("your-project") || key.includes("your-")) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Refreshes the Auth session on each matched request.
 * Skips network calls when Supabase env is not configured (local UI demos).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!hasConfiguredSupabase()) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  try {
    // Do not run logic between createServerClient and getClaims().
    await supabase.auth.getClaims();
  } catch (error) {
    console.warn("[supabase middleware] session refresh skipped:", error);
  }

  return supabaseResponse;
}
