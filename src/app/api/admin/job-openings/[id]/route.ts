import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/api-guards";
import {
  DEMO_ACTIVE_TALENT,
  DEMO_ADMIN_JOB_MATCHES,
  DEMO_ADMIN_JOB_OPENINGS,
  DEMO_ADMIN_TALENT,
} from "@/lib/admin/demo";
import { proposeAiMatches } from "@/lib/matching/ai-match";
import { getJobOpeningDetailForAdmin } from "@/lib/matching/job-opening-admin";
import type {
  ScoreJobInput,
  ScoreTalentInput,
} from "@/lib/matching/score-candidate";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function demoScoreTalent(
  matchedIds: Set<string>
): {
  display: typeof DEMO_ACTIVE_TALENT;
  scoring: ScoreTalentInput[];
} {
  const display = DEMO_ACTIVE_TALENT.filter((t) => !matchedIds.has(t.id));
  const byId = new Map(DEMO_ADMIN_TALENT.map((t) => [t.id, t]));

  const scoring: ScoreTalentInput[] = display.map((opt) => {
    const row = byId.get(opt.id);
    if (!row) {
      return {
        id: opt.id,
        locationModes: [],
        globalCity: null,
        globalCountry: null,
        payType: "annual",
        minSalary: null,
        timezone: null,
        timezoneOffset: null,
        workHoursStart: null,
        workHoursEnd: null,
        visaStatus: null,
        verifiedSkills: [],
        verifiedSuperpowers: [],
        selectedTagline: null,
        hasResume: false,
        hasProfileBasics: false,
        verifiedReferenceCount: 0,
        avgAuthenticityScore: null,
      };
    }

    // Seed distinct signals so demo ranking is visibly ordered.
    const demoSkills =
      row.id === "cand-1"
        ? ["TypeScript", "Kubernetes", "Postgres"]
        : row.id === "cand-2"
          ? ["TypeScript", "Postgres"]
          : ["Figma"];
    const demoPowers =
      row.id === "cand-1"
        ? ["arch-platform", "speed-ship"]
        : row.id === "cand-2"
          ? ["arch-platform"]
          : [];
    const demoVisa =
      row.id === "cand-1" ? "none" : row.id === "cand-2" ? "eu_work" : "none";
    const demoPay =
      row.id === "cand-1" ? 170000 : row.id === "cand-2" ? 155000 : 120000;

    return {
      id: row.id,
      locationModes: row.location_modes,
      globalCity: row.global_city,
      globalCountry: row.global_country,
      payType: "annual",
      minSalary: demoPay,
      timezone: row.timezone,
      timezoneOffset: row.timezone_offset,
      workHoursStart: row.work_hours_start,
      workHoursEnd: row.work_hours_end,
      visaStatus: demoVisa,
      verifiedSkills: demoSkills,
      verifiedSuperpowers: demoPowers,
      selectedTagline: row.headline,
      hasResume: Boolean(
        row.raw_resume_text?.trim() || row.sanitized_summary?.trim()
      ),
      hasProfileBasics: !row.missing.profile,
      verifiedReferenceCount: row.references.filter((r) => r.status === "verified")
        .length,
      avgAuthenticityScore: row.avg_authenticity_score,
    };
  });

  return { display, scoring };
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  if (auth.actor.demo) {
    const job = DEMO_ADMIN_JOB_OPENINGS.find((j) => j.id === id);
    if (!job) {
      return NextResponse.json({ error: "Job opening not found" }, { status: 404 });
    }
    const matches = DEMO_ADMIN_JOB_MATCHES[id] ?? [];
    const matchedIds = new Set(matches.map((m) => m.talent_profile_id));
    const { display, scoring } = demoScoreTalent(matchedIds);

    const jobForScore: ScoreJobInput & { updatedAt: string } = {
      locationModes: job.location_modes,
      globalCity: job.global_city,
      globalCountry: "United States",
      payType: job.pay_type ?? "annual",
      minSalary: job.min_salary,
      timezone: "America/Chicago",
      workHoursStart: "09:00:00",
      workHoursEnd: "17:00:00",
      visaStatuses: ["none", "us_green_card"],
      verifiedSkills: ["TypeScript", "Kubernetes", "Postgres"],
      endorsedSkills: ["arch-platform", "speed-ship"],
      updatedAt: job.updated_at,
    };

    const displayMeta = new Map(
      display.map((t) => [
        t.id,
        {
          headline: t.headline,
          email: t.email,
          full_name: t.full_name,
          status: t.status,
        },
      ])
    );

    const aiMatch = await proposeAiMatches(
      {
        jobPostingId: id,
        job: jobForScore,
        talent: scoring,
        fingerprintExtra: [...matchedIds].sort().join(","),
      },
      displayMeta
    );

    return NextResponse.json({
      demo: true,
      job: {
        ...job,
        description:
          "Build and operate the core platform services that power Acme’s product suite.",
        verified_skills: ["TypeScript", "Kubernetes", "Postgres"],
        years_experience: 8,
        suggested_taglines: [
          "Owns multi-region reliability end to end",
          "Cuts p99 latency without sacrificing clarity",
          "Turns fuzzy product asks into durable platform APIs",
        ],
        endorsed_skills: ["arch-platform", "speed-ship"],
        timezone: "America/Chicago",
        work_hours_start: "09:00:00",
        work_hours_end: "17:00:00",
        visa_statuses: ["none", "us_green_card"],
        kanban_columns: ["sourced", "screening", "interview", "offer", "hired"],
      },
      matches,
      matchableTalent: aiMatch.matchableTalent,
      aiMatch,
    });
  }

  try {
    const supabase = await createClient();
    const detail = await getJobOpeningDetailForAdmin(supabase, id);
    if (!detail) {
      return NextResponse.json({ error: "Job opening not found" }, { status: 404 });
    }

    const jobForScore: ScoreJobInput & { updatedAt: string } = {
      locationModes: detail.job.location_modes,
      globalCity: detail.job.global_city,
      payType: detail.job.pay_type ?? "annual",
      minSalary: detail.job.min_salary,
      timezone: detail.job.timezone,
      workHoursStart: detail.job.work_hours_start,
      workHoursEnd: detail.job.work_hours_end,
      visaStatuses: detail.job.visa_statuses,
      verifiedSkills: detail.job.verified_skills,
      endorsedSkills: detail.job.endorsed_skills,
      updatedAt: detail.job.updated_at,
    };

    const displayMeta = new Map(
      detail.matchableTalent.map((t) => [
        t.id,
        {
          headline: t.headline,
          email: t.email,
          full_name: t.full_name,
          status: t.status,
        },
      ])
    );

    const aiMatch = await proposeAiMatches(
      {
        jobPostingId: id,
        job: jobForScore,
        talent: detail.matchableTalentForScoring,
        fingerprintExtra: detail.matches
          .map((m) => m.talent_profile_id)
          .sort()
          .join(","),
      },
      displayMeta
    );

    const { matchableTalentForScoring: _scoring, ...rest } = detail;

    return NextResponse.json({
      demo: false,
      ...rest,
      matchableTalent: aiMatch.matchableTalent,
      aiMatch,
    });
  } catch (err) {
    console.error(
      "[admin job opening detail]",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: "Unable to load job opening" },
      { status: 500 }
    );
  }
}
