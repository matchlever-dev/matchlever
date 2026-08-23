import { NextResponse } from "next/server";
import { z } from "zod";

import { captureTalentLinkedInUrl } from "@/lib/auth/linkedin-url";
import {
  DEMO_TALENT_DASHBOARD,
  formatTimezoneDisplay,
  hasCompleteReferences,
  initialsFromName,
  REQUIRED_VERIFIED_REFERENCES,
  resolveTimezoneId,
  type TalentDashboardData,
  type TalentReferenceRow,
} from "@/lib/dashboard/talent";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

function skillsFromJson(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(DEMO_TALENT_DASHBOARD);
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

    let { data: profile, error } = await supabase
      .from("talent_profiles")
      .select(
        "id, headline, selected_tagline, suggested_taglines, verified_skills, global_city, global_country, timezone, timezone_offset, status, raw_resume_text"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error?.message?.includes("timezone")) {
      const fallback = await supabase
        .from("talent_profiles")
        .select(
          "id, headline, selected_tagline, suggested_taglines, verified_skills, global_city, global_country, timezone_offset, status, raw_resume_text"
        )
        .eq("user_id", user.id)
        .maybeSingle();
      profile = fallback.data
        ? { ...fallback.data, timezone: null as string | null }
        : null;
      error = fallback.error;
    }

    if (error) {
      console.error("[talent dashboard]", error.message);
      return NextResponse.json(
        { error: "Unable to load talent dashboard" },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          error: "Talent profile not found",
          code: "PROFILE_MISSING",
          redirectTo: "/onboarding",
        },
        { status: 404 }
      );
    }

    const { data: references, error: refError } = await supabase
      .from("talent_references")
      .select(
        "id, reference_email, reference_linkedin_url, reference_name, relationship, status, verification_token"
      )
      .eq("talent_profile_id", profile.id)
      .order("created_at", { ascending: true });

    if (refError) {
      console.error("[talent dashboard refs]", refError.message);
      return NextResponse.json(
        { error: "Unable to load references" },
        { status: 500 }
      );
    }

    const taglines = Array.isArray(profile.suggested_taglines)
      ? profile.suggested_taglines.map(String)
      : [];

    const { data: userProfile, error: userProfileError } = await supabase
      .from("user_profiles")
      .select("linkedin_url")
      .eq("id", user.id)
      .maybeSingle();
    if (userProfileError && !userProfileError.message.includes("linkedin_url")) {
      console.error("[talent dashboard user_profiles]", userProfileError.message);
    }

    const linkedinUrl = await captureTalentLinkedInUrl({
      stored: userProfileError ? null : userProfile?.linkedin_url,
      authUser: user,
      resumeText: profile.raw_resume_text,
      accessToken: session?.provider_token,
    });
    if (
      linkedinUrl &&
      !userProfileError &&
      linkedinUrl !== userProfile?.linkedin_url
    ) {
      const { error: linkedInError } = await supabase
        .from("user_profiles")
        .update({ linkedin_url: linkedinUrl })
        .eq("id", user.id);
      if (linkedInError) {
        console.error("[talent dashboard linkedin_url]", linkedInError.message);
      }
    }

    const fullName =
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null) ||
      (typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null) ||
      user.email;

    const refs = ((references ?? []) as TalentReferenceRow[]).map((ref) => ({
      ...ref,
      reference_email: ref.reference_email,
      reference_linkedin_url: ref.reference_linkedin_url ?? null,
    }));
    const refsComplete = hasCompleteReferences(refs);
    let status: TalentDashboardData["status"] =
      profile.status === "on_hold" ? "on_hold" : "actively_looking";

    // Never surface as actively looking until all references are verified.
    if (status === "actively_looking" && !refsComplete) {
      status = "on_hold";
      void supabase
        .from("talent_profiles")
        .update({ status: "on_hold" })
        .eq("id", profile.id);
    }

    const payload: TalentDashboardData = {
      demo: false,
      profileId: profile.id,
      initials: initialsFromName(fullName),
      headline: profile.headline || "MatchLever Talent",
      selectedTagline:
        profile.selected_tagline ||
        taglines[0] ||
        "Enterprise software talent ready for the right match",
      verifiedSkills: skillsFromJson(profile.verified_skills),
      globalCity: profile.global_city || "Remote",
      globalCountry: profile.global_country || "Global",
      timezone: resolveTimezoneId(profile.timezone, profile.timezone_offset),
      timezoneOffset: profile.timezone_offset,
      timezoneLabel: formatTimezoneDisplay(
        profile.timezone,
        profile.timezone_offset
      ),
      status,
      linkedinUrl,
      references: refs,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load dashboard";
    if (message.includes("Supabase is not configured")) {
      return NextResponse.json(DEMO_TALENT_DASHBOARD);
    }
    console.error("[/api/dashboard/talent]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const statusSchema = z.object({
  status: z.enum(["actively_looking", "on_hold"]),
});

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        ok: true,
        demo: true,
        status: parsed.data.status,
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("talent_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Talent profile not found" },
        { status: 404 }
      );
    }

    if (parsed.data.status === "actively_looking") {
      const { data: references, error: refError } = await supabase
        .from("talent_references")
        .select("status")
        .eq("talent_profile_id", profile.id);

      if (refError) {
        console.error("[talent status refs]", refError.message);
        return NextResponse.json(
          { error: "Unable to verify references" },
          { status: 500 }
        );
      }

      if (!hasCompleteReferences(references ?? [])) {
        return NextResponse.json(
          {
            error: `Complete all ${REQUIRED_VERIFIED_REFERENCES} references before turning Actively Looking on.`,
          },
          { status: 400 }
        );
      }
    }

    const { error } = await supabase
      .from("talent_profiles")
      .update({ status: parsed.data.status })
      .eq("id", profile.id);

    if (error) {
      console.error("[talent status]", error.message);
      return NextResponse.json(
        { error: "Unable to update status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, status: parsed.data.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update status";
    console.error("[/api/dashboard/talent PATCH]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
