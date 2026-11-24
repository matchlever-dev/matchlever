import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildIncognitoProfile,
  type IncognitoProfile,
} from "@/lib/matching/incognito-profile";
import type { Database, Json } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type EmployerJobMatchListItem = {
  id: string;
  matchIndex: number;
  headline: string;
  initials: string;
  tagline: string;
  employerResponse: "pending" | "accepted" | "passed";
  acceptToken: string;
  createdAt: string;
};

export type EmployerMatchView = {
  matchId: string;
  jobId: string;
  jobTitle: string;
  companyName: string | null;
  matchIndex: number;
  employerResponse: "pending" | "accepted" | "passed";
  acceptToken: string;
  profile: IncognitoProfile;
  linkedinUrl: string | null;
};

export const DEMO_EMPLOYER_JOB_MATCHES: Record<
  string,
  EmployerJobMatchListItem[]
> = {
  "demo-job-1": [
    {
      id: "demo-hs-1",
      matchIndex: 1,
      headline: "Staff Platform Engineer",
      initials: "SP",
      tagline: "Ships platform work under pressure",
      employerResponse: "pending",
      acceptToken: "demo-employer-match-token-0001",
      createdAt: "2026-09-02T14:00:00.000Z",
    },
  ],
  "demo-job-2": [],
};

export const DEMO_EMPLOYER_MATCH_VIEWS: Record<string, EmployerMatchView> = {
  "demo-employer-match-token-0001": {
    matchId: "demo-hs-1",
    jobId: "demo-job-1",
    jobTitle: "Staff Platform Engineer",
    companyName: "Acme Systems",
    matchIndex: 1,
    employerResponse: "pending",
    acceptToken: "demo-employer-match-token-0001",
    profile: {
      initials: "SP",
      headline: "Staff Platform Engineer",
      tagline: "Ships platform work under pressure",
      summary:
        "Anonymous MatchLever profile prepared from resume and verified signals. Strong platform delivery across ambiguous scopes.",
      verifiedSkills: ["TypeScript", "System Design", "Kubernetes"],
      yearsExperience: 10,
      locationLine: "San Francisco, United States",
      timezoneLabel: "Pacific Time (UTC−8)",
      locationModes: ["hybrid", "remote"],
      payType: "annual",
      minSalary: 185000,
      visaStatus: "none",
      workHours: "09:00 – 17:00",
    },
    linkedinUrl: null,
  },
};

function resolveEmployerResponse(input: {
  employer_response: string | null;
  accepted_at: string | null;
  passed_at: string | null;
}): "pending" | "accepted" | "passed" {
  if (
    input.employer_response === "accepted" ||
    input.employer_response === "passed"
  ) {
    return input.employer_response;
  }
  if (input.accepted_at) return "accepted";
  if (input.passed_at) return "passed";
  return "pending";
}

function asStringArray(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).map((s) => s.trim()).filter(Boolean);
}

/** List matches for an employer-owned job opening (incognito list + accept tokens). */
export async function listEmployerJobMatches(
  supabase: Supabase,
  jobPostingId: string
): Promise<EmployerJobMatchListItem[]> {
  type HandshakeRow = {
    id: string;
    talent_profile_id: string;
    match_index: number | null;
    employer_response: string | null;
    accepted_at: string | null;
    passed_at: string | null;
    accept_token: string;
    created_at: string;
  };

  let handshakes: HandshakeRow[] = [];
  const full = await supabase
    .from("match_handshakes")
    .select(
      "id, talent_profile_id, match_index, employer_response, accepted_at, passed_at, accept_token, created_at"
    )
    .eq("job_posting_id", jobPostingId)
    .order("match_index", { ascending: true });

  if (full.error) {
    console.warn(
      "[employer job matches]",
      full.error.message,
      "— falling back without employer_response/accept_token columns"
    );
    const legacy = await supabase
      .from("match_handshakes")
      .select("id, talent_profile_id, accepted_at, created_at")
      .eq("job_posting_id", jobPostingId)
      .order("created_at", { ascending: true });
    if (legacy.error) {
      console.warn("[employer job matches legacy]", legacy.error.message);
      return [];
    }
    handshakes = (legacy.data ?? []).map((row, index) => ({
      id: row.id,
      talent_profile_id: row.talent_profile_id,
      match_index: index + 1,
      employer_response: row.accepted_at ? "accepted" : "pending",
      accepted_at: row.accepted_at,
      passed_at: null,
      accept_token: "",
      created_at: row.created_at,
    }));
  } else {
    handshakes = (full.data ?? []).map((row) => ({
      id: row.id,
      talent_profile_id: row.talent_profile_id,
      match_index: row.match_index,
      employer_response: row.employer_response,
      accepted_at: row.accepted_at,
      passed_at: row.passed_at,
      accept_token: row.accept_token,
      created_at: row.created_at,
    }));
  }

  if (handshakes.length === 0) return [];

  const talentIds = [...new Set(handshakes.map((h) => h.talent_profile_id))];
  const { data: talentRows } = await supabase
    .from("talent_profiles")
    .select(
      "id, user_id, headline, selected_tagline, verified_skills, years_experience"
    )
    .in("id", talentIds);

  const userIds = [...new Set((talentRows ?? []).map((t) => t.user_id))];
  const { data: users } = userIds.length
    ? await supabase
        .from("user_profiles")
        .select("id, full_name")
        .in("id", userIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const talentMap = new Map((talentRows ?? []).map((t) => [t.id, t]));
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  return handshakes.map((h, index) => {
    const talent = talentMap.get(h.talent_profile_id);
    const user = talent ? userMap.get(talent.user_id) : null;
    const profile = buildIncognitoProfile({
      headline: talent?.headline ?? null,
      selectedTagline: talent?.selected_tagline ?? null,
      sanitizedSummary: null,
      verifiedSkills: (talent?.verified_skills ?? []) as Json,
      yearsExperience: talent?.years_experience ?? null,
      globalCity: null,
      globalCountry: null,
      timezone: null,
      timezoneOffset: null,
      locationModes: null,
      minSalary: null,
      visaStatus: null,
      workHoursStart: null,
      workHoursEnd: null,
      fullName: user?.full_name ?? null,
    });
    return {
      id: h.id,
      matchIndex: h.match_index ?? index + 1,
      headline: profile.headline,
      initials: profile.initials,
      tagline: profile.tagline,
      employerResponse: resolveEmployerResponse(h),
      acceptToken: h.accept_token || "",
      createdAt: h.created_at,
    };
  });
}

/** Load the same incognito profile the employer received by email, via accept token. */
export async function getEmployerMatchViewByToken(
  supabase: Supabase,
  token: string
): Promise<EmployerMatchView | null> {
  const trimmed = token.trim();
  if (trimmed.length < 16) return null;

  type HandshakeView = {
    id: string;
    job_posting_id: string;
    talent_profile_id: string;
    match_index: number | null;
    employer_response: string | null;
    accepted_at: string | null;
    passed_at: string | null;
    accept_token: string;
  };

  let handshake: HandshakeView | null = null;
  const full = await supabase
    .from("match_handshakes")
    .select(
      "id, job_posting_id, talent_profile_id, match_index, employer_response, accepted_at, passed_at, accept_token"
    )
    .eq("accept_token", trimmed)
    .maybeSingle();

  if (full.error) {
    console.warn("[employer match view]", full.error.message);
    return null;
  }
  handshake = full.data;

  if (!handshake) return null;

  const [{ data: job }, { data: talent }] = await Promise.all([
    supabase
      .from("job_postings")
      .select("id, title, company_name, employer_profile_id")
      .eq("id", handshake.job_posting_id)
      .maybeSingle(),
    supabase
      .from("talent_profiles")
      .select(
        "id, user_id, headline, selected_tagline, sanitized_summary, verified_skills, years_experience, global_city, global_country, timezone, timezone_offset, location_modes, pay_type, min_salary, visa_status, work_hours_start, work_hours_end"
      )
      .eq("id", handshake.talent_profile_id)
      .maybeSingle(),
  ]);

  if (!job || !talent) return null;

  const [{ data: talentUser }, { data: employer }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, full_name, linkedin_url")
      .eq("id", talent.user_id)
      .maybeSingle(),
    supabase
      .from("employer_profiles")
      .select("id, company_name")
      .eq("id", job.employer_profile_id)
      .maybeSingle(),
  ]);

  const employerResponse = resolveEmployerResponse(handshake);
  const profile = buildIncognitoProfile({
    headline: talent.headline,
    selectedTagline: talent.selected_tagline,
    sanitizedSummary: talent.sanitized_summary,
    verifiedSkills: talent.verified_skills,
    yearsExperience: talent.years_experience,
    globalCity: talent.global_city,
    globalCountry: talent.global_country,
    timezone: talent.timezone,
    timezoneOffset: talent.timezone_offset,
    locationModes: talent.location_modes,
    payType: talent.pay_type,
    minSalary: talent.min_salary,
    visaStatus: talent.visa_status,
    workHoursStart: talent.work_hours_start,
    workHoursEnd: talent.work_hours_end,
    fullName: talentUser?.full_name ?? null,
  });

  return {
    matchId: handshake.id,
    jobId: job.id,
    jobTitle: job.title,
    companyName: job.company_name || employer?.company_name || null,
    matchIndex: handshake.match_index ?? 1,
    employerResponse,
    acceptToken: handshake.accept_token,
    profile: {
      ...profile,
      verifiedSkills:
        profile.verifiedSkills.length > 0
          ? profile.verifiedSkills
          : asStringArray(talent.verified_skills),
    },
    linkedinUrl:
      employerResponse === "accepted"
        ? talentUser?.linkedin_url?.trim() || null
        : null,
  };
}

export function getMatchViewPath(token: string) {
  return `/matches/view?token=${encodeURIComponent(token)}`;
}
