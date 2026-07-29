import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEMO_CANDIDATE_DASHBOARD,
  formatTimezoneOffset,
  hasCompleteReferences,
  initialsFromName,
  REQUIRED_VERIFIED_REFERENCES,
  type CandidateDashboardData,
  type CandidateReferenceRow,
} from "@/lib/dashboard/candidate";
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
      return NextResponse.json(DEMO_CANDIDATE_DASHBOARD);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("candidate_profiles")
      .select(
        "id, headline, selected_tagline, suggested_taglines, verified_skills, global_city, global_country, timezone_offset, status"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[candidate dashboard]", error.message);
      return NextResponse.json(
        { error: "Unable to load candidate dashboard" },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          error: "Candidate profile not found",
          code: "PROFILE_MISSING",
          redirectTo: "/onboarding",
        },
        { status: 404 }
      );
    }

    const { data: references, error: refError } = await supabase
      .from("candidate_references")
      .select(
        "id, reference_email, reference_linkedin_url, reference_name, relationship, status, verification_token"
      )
      .eq("candidate_profile_id", profile.id)
      .order("created_at", { ascending: true });

    if (refError) {
      console.error("[candidate dashboard refs]", refError.message);
      return NextResponse.json(
        { error: "Unable to load references" },
        { status: 500 }
      );
    }

    const taglines = Array.isArray(profile.suggested_taglines)
      ? profile.suggested_taglines.map(String)
      : [];

    const fullName =
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null) ||
      (typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null) ||
      user.email;

    const refs = ((references ?? []) as CandidateReferenceRow[]).map((ref) => ({
      ...ref,
      reference_email: ref.reference_email,
      reference_linkedin_url: ref.reference_linkedin_url ?? null,
    }));
    const refsComplete = hasCompleteReferences(refs);
    let status: CandidateDashboardData["status"] =
      profile.status === "on_hold" ? "on_hold" : "actively_looking";

    // Never surface as actively looking until all references are verified.
    if (status === "actively_looking" && !refsComplete) {
      status = "on_hold";
      void supabase
        .from("candidate_profiles")
        .update({ status: "on_hold" })
        .eq("id", profile.id);
    }

    const payload: CandidateDashboardData = {
      demo: false,
      profileId: profile.id,
      initials: initialsFromName(fullName),
      headline: profile.headline || "MatchLever Candidate",
      selectedTagline:
        profile.selected_tagline ||
        taglines[0] ||
        "Enterprise software talent ready for the right match",
      verifiedSkills: skillsFromJson(profile.verified_skills),
      globalCity: profile.global_city || "Remote",
      globalCountry: profile.global_country || "Global",
      timezoneOffset: profile.timezone_offset,
      timezoneLabel: formatTimezoneOffset(profile.timezone_offset),
      status,
      references: refs,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load dashboard";
    if (message.includes("Supabase is not configured")) {
      return NextResponse.json(DEMO_CANDIDATE_DASHBOARD);
    }
    console.error("[/api/dashboard/candidate]", message);
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
      .from("candidate_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Candidate profile not found" },
        { status: 404 }
      );
    }

    if (parsed.data.status === "actively_looking") {
      const { data: references, error: refError } = await supabase
        .from("candidate_references")
        .select("status")
        .eq("candidate_profile_id", profile.id);

      if (refError) {
        console.error("[candidate status refs]", refError.message);
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
      .from("candidate_profiles")
      .update({ status: parsed.data.status })
      .eq("id", profile.id);

    if (error) {
      console.error("[candidate status]", error.message);
      return NextResponse.json(
        { error: "Unable to update status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, status: parsed.data.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update status";
    console.error("[/api/dashboard/candidate PATCH]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
