import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { markMatchBilling } from "@/lib/matching/billing";
import { isMatchableTalentStatus } from "@/lib/matching/eligibility";
import {
  buildIncognitoProfile,
  type IncognitoProfile,
} from "@/lib/matching/incognito-profile";
import {
  sendMatchIncognitoEmail,
  sendMatchLinkedInEmail,
} from "@/lib/email/resend";
import type { Database, Json } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type CreatedMatch = {
  id: string;
  jobPostingId: string;
  talentProfileId: string;
  matchIndex: number;
  billingStatus: "free" | "invoiced";
  invoiceCycle: number;
  matchSource: "manual" | "ai";
  acceptToken: string;
  acceptedAt: string | null;
  kanbanColumn: string;
  notes: string | null;
  employerEmailSent: boolean;
  emailDemo: boolean;
};

function newAcceptToken() {
  return randomBytes(24).toString("hex");
}

function columnsFromJson(value: Json): string[] {
  if (!Array.isArray(value)) {
    return ["sourced", "screening", "interview", "offer", "hired"];
  }
  return value.map(String).filter(Boolean);
}

export async function createManualMatch(args: {
  supabase: Supabase;
  jobPostingId: string;
  talentProfileId: string;
  matchedBy: string | null;
  kanbanColumn?: string;
  notes?: string;
}): Promise<
  | { ok: true; match: CreatedMatch; incognito: IncognitoProfile }
  | { ok: false; error: string; status: number }
> {
  const [{ data: talent }, { data: job }] = await Promise.all([
    args.supabase
      .from("talent_profiles")
      .select(
        "id, user_id, status, headline, selected_tagline, sanitized_summary, verified_skills, years_experience, global_city, global_country, timezone, timezone_offset, location_modes, min_salary, visa_status, work_hours_start, work_hours_end"
      )
      .eq("id", args.talentProfileId)
      .maybeSingle(),
    args.supabase
      .from("job_postings")
      .select(
        "id, title, status, company_name, kanban_columns, employer_profile_id"
      )
      .eq("id", args.jobPostingId)
      .maybeSingle(),
  ]);

  if (!talent || !isMatchableTalentStatus(talent.status)) {
    return {
      ok: false,
      error: "Talent must be Active or On Hold (Incomplete profiles cannot be matched)",
      status: 400,
    };
  }
  if (!job) {
    return { ok: false, error: "Job opening not found", status: 404 };
  }
  if (job.status !== "active" && job.status !== "paused") {
    return {
      ok: false,
      error: "Only active or paused job openings can receive matches",
      status: 400,
    };
  }

  const { data: existing } = await args.supabase
    .from("match_handshakes")
    .select("id")
    .eq("job_posting_id", args.jobPostingId)
    .eq("talent_profile_id", args.talentProfileId)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: "This talent is already matched to this job opening",
      status: 409,
    };
  }

  const { count } = await args.supabase
    .from("match_handshakes")
    .select("id", { count: "exact", head: true })
    .eq("job_posting_id", args.jobPostingId);

  const matchIndex = (count ?? 0) + 1;
  const billing = markMatchBilling(matchIndex);
  const columns = columnsFromJson(job.kanban_columns);
  const column =
    args.kanbanColumn && columns.includes(args.kanbanColumn)
      ? args.kanbanColumn
      : columns[0] || "sourced";
  const acceptToken = newAcceptToken();

  const { data: handshake, error } = await args.supabase
    .from("match_handshakes")
    .insert({
      job_posting_id: args.jobPostingId,
      talent_profile_id: args.talentProfileId,
      kanban_column: column,
      is_manual_match: true,
      match_source: "manual",
      matched_by: args.matchedBy,
      notes: args.notes?.trim() || "Manual match",
      match_index: billing.matchIndex,
      billing_status: billing.billingStatus,
      invoice_cycle: billing.invoiceCycle,
      accept_token: acceptToken,
    })
    .select(
      "id, job_posting_id, talent_profile_id, match_index, billing_status, invoice_cycle, match_source, accept_token, accepted_at, kanban_column, notes"
    )
    .maybeSingle();

  if (error || !handshake) {
    console.error("[create manual match]", error?.message);
    return { ok: false, error: "Unable to create match", status: 500 };
  }

  const [{ data: talentUser }, { data: employer }] = await Promise.all([
    args.supabase
      .from("user_profiles")
      .select("id, full_name, linkedin_url")
      .eq("id", talent.user_id)
      .maybeSingle(),
    args.supabase
      .from("employer_profiles")
      .select("id, user_id, company_name")
      .eq("id", job.employer_profile_id)
      .maybeSingle(),
  ]);

  const { data: employerUser } = employer
    ? await args.supabase
        .from("user_profiles")
        .select("id, email, full_name")
        .eq("id", employer.user_id)
        .maybeSingle()
    : { data: null };

  const incognito = buildIncognitoProfile({
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
    minSalary: talent.min_salary,
    visaStatus: talent.visa_status,
    workHoursStart: talent.work_hours_start,
    workHoursEnd: talent.work_hours_end,
    fullName: talentUser?.full_name ?? null,
  });

  let employerEmailSent = false;
  let emailDemo = false;

  if (employerUser?.email) {
    try {
      const delivered = await sendMatchIncognitoEmail({
        to: employerUser.email,
        employerName: employerUser.full_name,
        jobTitle: job.title,
        companyName: job.company_name || employer?.company_name || null,
        profile: incognito,
        acceptToken: handshake.accept_token,
        billingStatus: handshake.billing_status as "free" | "invoiced",
        matchIndex: handshake.match_index,
      });
      employerEmailSent = !delivered.skipped;
      emailDemo = Boolean(delivered.demo);
      if (!delivered.skipped) {
        await args.supabase
          .from("match_handshakes")
          .update({ employer_notified_at: new Date().toISOString() })
          .eq("id", handshake.id);
      }
    } catch (err) {
      console.error(
        "[match email]",
        err instanceof Error ? err.message : err
      );
    }
  }

  return {
    ok: true,
    match: {
      id: handshake.id,
      jobPostingId: handshake.job_posting_id,
      talentProfileId: handshake.talent_profile_id,
      matchIndex: handshake.match_index,
      billingStatus: handshake.billing_status as "free" | "invoiced",
      invoiceCycle: handshake.invoice_cycle,
      matchSource: handshake.match_source as "manual" | "ai",
      acceptToken: handshake.accept_token,
      acceptedAt: handshake.accepted_at,
      kanbanColumn: handshake.kanban_column,
      notes: handshake.notes,
      employerEmailSent,
      emailDemo,
    },
    incognito,
  };
}

export async function acceptMatchByToken(args: {
  supabase: Supabase;
  token: string;
}): Promise<
  | {
      ok: true;
      alreadyAccepted: boolean;
      jobTitle: string;
      companyName: string | null;
      talentHeadline: string;
      linkedinUrl: string | null;
      linkedinEmailSent: boolean;
      emailDemo: boolean;
    }
  | { ok: false; error: string; status: number }
> {
  const token = args.token.trim();
  if (token.length < 16) {
    return { ok: false, error: "Invalid accept token", status: 400 };
  }

  const { data: handshake } = await args.supabase
    .from("match_handshakes")
    .select(
      "id, job_posting_id, talent_profile_id, accepted_at, linkedin_sent_at, accept_token"
    )
    .eq("accept_token", token)
    .maybeSingle();

  if (!handshake) {
    return { ok: false, error: "Match not found", status: 404 };
  }

  const [{ data: job }, { data: talent }] = await Promise.all([
    args.supabase
      .from("job_postings")
      .select("id, title, company_name, employer_profile_id")
      .eq("id", handshake.job_posting_id)
      .maybeSingle(),
    args.supabase
      .from("talent_profiles")
      .select("id, user_id, headline")
      .eq("id", handshake.talent_profile_id)
      .maybeSingle(),
  ]);

  if (!job || !talent) {
    return { ok: false, error: "Match details unavailable", status: 404 };
  }

  const [{ data: talentUser }, { data: employer }] = await Promise.all([
    args.supabase
      .from("user_profiles")
      .select("id, linkedin_url, full_name")
      .eq("id", talent.user_id)
      .maybeSingle(),
    args.supabase
      .from("employer_profiles")
      .select("id, user_id, company_name")
      .eq("id", job.employer_profile_id)
      .maybeSingle(),
  ]);

  const { data: employerUser } = employer
    ? await args.supabase
        .from("user_profiles")
        .select("id, email, full_name")
        .eq("id", employer.user_id)
        .maybeSingle()
    : { data: null };

  const alreadyAccepted = Boolean(handshake.accepted_at);
  const now = new Date().toISOString();

  if (!alreadyAccepted) {
    const { error } = await args.supabase
      .from("match_handshakes")
      .update({
        accepted_at: now,
        kanban_column: "screening",
      })
      .eq("id", handshake.id);
    if (error) {
      console.error("[accept match]", error.message);
      return { ok: false, error: "Unable to accept match", status: 500 };
    }
  }

  const linkedinUrl = talentUser?.linkedin_url?.trim() || null;
  let linkedinEmailSent = Boolean(handshake.linkedin_sent_at);
  let emailDemo = false;

  if (employerUser?.email && linkedinUrl && !handshake.linkedin_sent_at) {
    try {
      const delivered = await sendMatchLinkedInEmail({
        to: employerUser.email,
        employerName: employerUser.full_name,
        jobTitle: job.title,
        companyName: job.company_name || employer?.company_name || null,
        talentHeadline: talent.headline || "MatchLever talent",
        linkedinUrl,
      });
      linkedinEmailSent = !delivered.skipped;
      emailDemo = Boolean(delivered.demo);
      if (!delivered.skipped) {
        await args.supabase
          .from("match_handshakes")
          .update({ linkedin_sent_at: now })
          .eq("id", handshake.id);
      }
    } catch (err) {
      console.error(
        "[linkedin email]",
        err instanceof Error ? err.message : err
      );
    }
  }

  return {
    ok: true,
    alreadyAccepted,
    jobTitle: job.title,
    companyName: job.company_name || employer?.company_name || null,
    talentHeadline: talent.headline || "MatchLever talent",
    linkedinUrl,
    linkedinEmailSent,
    emailDemo,
  };
}
