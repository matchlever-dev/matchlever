import { NextResponse } from "next/server";

import { captureCandidateLinkedInUrl } from "@/lib/auth/linkedin-url";
import {
  resolvePostLoginPath,
  sanitizeNextPath,
} from "@/lib/auth/post-login-redirect";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth return handler. Exchanges the auth code for a session, then routes
 * candidates / admins / superusers to the right surface.
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
    return NextResponse.redirect(new URL(next || "/dashboard/candidate", url.origin));
  }

  try {
    const supabase = await createClient();

    let providerToken: string | null = null;
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(
          new URL(
            `/login?error=${encodeURIComponent(error.message)}`,
            url.origin
          )
        );
      }
      providerToken = data.session?.provider_token ?? null;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    const linkedInUrl = user
      ? await captureCandidateLinkedInUrl({
          authUser: user,
          accessToken: providerToken || session?.provider_token,
        })
      : null;
    if (user && linkedInUrl) {
      const writer = createAdminClient() ?? supabase;
      const { error: linkedInError } = await writer
        .from("user_profiles")
        .update({ linkedin_url: linkedInUrl })
        .eq("id", user.id);
      if (linkedInError) {
        console.error("[auth callback linkedin_url]", linkedInError.message);
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
