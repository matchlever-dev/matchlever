import { NextResponse } from "next/server";

import {
  resolvePostLoginPath,
  sanitizeNextPath,
} from "@/lib/auth/post-login-redirect";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth return handler. Exchanges the auth code for a session, then routes
 * seekers / admins / superusers to the right surface.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeNextPath(url.searchParams.get("next"));
  const oauthError = url.searchParams.get("error_description");

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(oauthError)}`, url.origin)
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL(next || "/dashboard/seeker", url.origin));
  }

  try {
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(
          new URL(
            `/login?error=${encodeURIComponent(error.message)}`,
            url.origin
          )
        );
      }
    }

    const destination = await resolvePostLoginPath(supabase, next);
    return NextResponse.redirect(new URL(destination, url.origin));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to complete sign-in";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, url.origin)
    );
  }
}
