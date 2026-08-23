import { NextResponse } from "next/server";

import {
  captureTalentLinkedInUrl,
  normalizePublicLinkedInProfileUrl,
} from "@/lib/auth/linkedin-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function persistLinkedInUrl(
  userClient: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  url: string
) {
  const admin = createAdminClient();
  const db = admin ?? userClient;

  const { data, error } = await db
    .from("user_profiles")
    .update({ linkedin_url: url })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[/api/me/linkedin persist profile]", error.message);
  }

  if (!error && !data) {
    const { error: insertError } = await db.from("user_profiles").insert({
      id: userId,
      linkedin_url: url,
      role: "talent",
    });
    if (insertError) {
      console.error("[/api/me/linkedin persist insert]", insertError.message);
    } else {
      return null;
    }
  }

  const { error: metaError } = await userClient.auth.updateUser({
    data: { linkedin_url: url },
  });
  if (metaError) {
    console.error("[/api/me/linkedin persist metadata]", metaError.message);
  }

  if (data?.id || !metaError) return null;
  return error?.message || metaError?.message || "Unable to save LinkedIn URL";
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ url: null, demo: true });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("linkedin_url")
      .eq("id", user.id)
      .maybeSingle();

    const url = await captureTalentLinkedInUrl({
      stored: profile?.linkedin_url,
      authUser: user,
      accessToken: session?.provider_token,
    });

    if (url && url !== profile?.linkedin_url) {
      await persistLinkedInUrl(supabase, user.id, url);
    }

    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load LinkedIn URL";
    console.error("[/api/me/linkedin GET]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { url?: unknown };
    const url = normalizePublicLinkedInProfileUrl(body.url);
    if (!url) {
      return NextResponse.json(
        {
          error:
            "Use a full LinkedIn profile URL (https://www.linkedin.com/in/...)",
        },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true, demo: true, url });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const persistError = await persistLinkedInUrl(supabase, user.id, url);
    if (persistError) {
      return NextResponse.json({ error: persistError }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save LinkedIn URL";
    console.error("[/api/me/linkedin PATCH]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
