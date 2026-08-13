import { NextResponse } from "next/server";
import { z } from "zod";

import { captureCandidateLinkedInUrl } from "@/lib/auth/linkedin-url";
import { linkedInUrlSchema } from "@/lib/reference/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function persistLinkedInUrl(userId: string, url: string) {
  const admin = createAdminClient();
  const client = admin ?? (await createClient());
  const { error } = await client
    .from("user_profiles")
    .update({ linkedin_url: url })
    .eq("id", userId);
  if (error) {
    console.error("[/api/me/linkedin persist]", error.message);
    return error.message;
  }
  return null;
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

    const url = await captureCandidateLinkedInUrl({
      stored: profile?.linkedin_url,
      authUser: user,
      accessToken: session?.provider_token,
    });

    if (url && url !== profile?.linkedin_url) {
      await persistLinkedInUrl(user.id, url);
    }

    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load LinkedIn URL";
    console.error("[/api/me/linkedin GET]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const patchSchema = z.object({
  url: linkedInUrlSchema,
});

export async function PATCH(request: Request) {
  try {
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Use a full LinkedIn profile URL (https://linkedin.com/in/...)" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true, demo: true, url: parsed.data.url });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const persistError = await persistLinkedInUrl(user.id, parsed.data.url);
    if (persistError) {
      return NextResponse.json(
        { error: "Unable to save LinkedIn URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, url: parsed.data.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save LinkedIn URL";
    console.error("[/api/me/linkedin PATCH]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
