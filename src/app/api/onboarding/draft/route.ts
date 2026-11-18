import { NextResponse } from "next/server";

import { SESSION_EXPIRED_MESSAGE } from "@/lib/auth/stay-signed-in";
import { onboardingFormObjectSchema } from "@/lib/onboarding/form-schema";
import {
  ensureUserProfileForTalent,
  loadOnboardingDraft,
  upsertTalentProfileDraft,
} from "@/lib/onboarding/persist-talent-profile";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Load a saved onboarding draft for the signed-in talent. */
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true, demo: true, draft: null });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: SESSION_EXPIRED_MESSAGE },
        { status: 401 }
      );
    }

    const draft = await loadOnboardingDraft(supabase, user.id);
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load onboarding draft";
    console.error("[/api/onboarding/draft GET]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Persist onboarding progress without requiring references.
 * Used for Continue autosave and "Finish later".
 */
export async function POST(request: Request) {
  try {
    const json = await request.json();
    // Accept partial / in-progress wizard payloads; strip unknown keys softly.
    const parsed = onboardingFormObjectSchema.partial().safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid onboarding draft",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (!isSupabaseConfigured()) {
      console.info("[onboarding/draft demo]", {
        title: data.anonymousTitle,
        city: data.globalCity,
      });
      return NextResponse.json({
        ok: true,
        demo: true,
        message: "Demo draft saved — configure Supabase to persist.",
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: SESSION_EXPIRED_MESSAGE },
        { status: 401 }
      );
    }

    if (data.linkedInConnected === false) {
      return NextResponse.json(
        { error: "Sign in with LinkedIn before saving progress." },
        { status: 400 }
      );
    }

    const userResult = await ensureUserProfileForTalent({
      supabase,
      user,
      talentLinkedInUrl: data.talentLinkedInUrl,
    });
    if (userResult.error) {
      return NextResponse.json({ error: userResult.error }, { status: 500 });
    }

    const talentResult = await upsertTalentProfileDraft({
      supabase,
      userId: user.id,
      data,
    });
    if (talentResult.error || !talentResult.talentId) {
      return NextResponse.json(
        { error: talentResult.error || "Unable to save draft" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      talentId: talentResult.talentId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save onboarding draft";
    console.error("[/api/onboarding/draft POST]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
