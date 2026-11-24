import type {
  AdminJobMatchRow,
  AdminJobOpeningRow,
} from "@/lib/admin/demo";
import { isMatchableTalentStatus } from "@/lib/matching/eligibility";
import type { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function asStringArray(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

export async function listJobOpeningsForAdmin(
  supabase: Supabase
): Promise<AdminJobOpeningRow[]> {
  const { data: jobs, error } = await supabase
    .from("job_postings")
    .select(
      "id, title, status, company_name, location_modes, global_city, pay_type, min_salary, employer_profile_id, updated_at"
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const employerIds = [
    ...new Set((jobs ?? []).map((j) => j.employer_profile_id)),
  ];
  const jobIds = (jobs ?? []).map((j) => j.id);

  type HandshakeStatRow = {
    id: string;
    job_posting_id: string;
    billing_status: string | null;
    employer_response: string | null;
    accepted_at: string | null;
    passed_at: string | null;
  };

  const employersPromise = employerIds.length
    ? supabase
        .from("employer_profiles")
        .select("id, user_id, company_name")
        .in("id", employerIds)
    : Promise.resolve({
        data: [] as { id: string; user_id: string; company_name: string }[],
        error: null,
      });

  // Prefer full match columns; fall back if Pass/billing migrations are not applied yet.
  let handshakes: HandshakeStatRow[] = [];
  if (jobIds.length) {
    const full = await supabase
      .from("match_handshakes")
      .select(
        "id, job_posting_id, billing_status, employer_response, accepted_at, passed_at"
      )
      .in("job_posting_id", jobIds);
    if (full.error) {
      console.warn(
        "[admin job openings handshakes]",
        full.error.message,
        "— falling back without employer_response/passed_at"
      );
      const legacy = await supabase
        .from("match_handshakes")
        .select("id, job_posting_id, accepted_at")
        .in("job_posting_id", jobIds);
      if (legacy.error) {
        console.warn(
          "[admin job openings handshakes legacy]",
          legacy.error.message
        );
      } else {
        handshakes = (legacy.data ?? []).map((row) => ({
          id: row.id,
          job_posting_id: row.job_posting_id,
          billing_status: null,
          employer_response: row.accepted_at ? "accepted" : "pending",
          accepted_at: row.accepted_at,
          passed_at: null,
        }));
      }
    } else {
      handshakes = (full.data ?? []).map((row) => ({
        id: row.id,
        job_posting_id: row.job_posting_id,
        billing_status: row.billing_status,
        employer_response: row.employer_response,
        accepted_at: row.accepted_at,
        passed_at: row.passed_at,
      }));
    }
  }

  const { data: employers, error: employersError } = await employersPromise;
  if (employersError) {
    console.warn("[admin job openings employers]", employersError.message);
  }

  const employerUserIds = [...new Set((employers ?? []).map((e) => e.user_id))];
  const { data: users } = employerUserIds.length
    ? await supabase
        .from("user_profiles")
        .select("id, email, full_name")
        .in("id", employerUserIds)
    : { data: [] as { id: string; email: string | null; full_name: string | null }[] };

  const employerMap = new Map((employers ?? []).map((e) => [e.id, e]));
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  const stats = new Map<
    string,
    {
      match_count: number;
      accepted_count: number;
      passed_count: number;
      free_match_count: number;
      invoiced_match_count: number;
    }
  >();

  for (const hs of handshakes) {
    const current = stats.get(hs.job_posting_id) ?? {
      match_count: 0,
      accepted_count: 0,
      passed_count: 0,
      free_match_count: 0,
      invoiced_match_count: 0,
    };
    current.match_count += 1;
    const response =
      hs.employer_response === "accepted" || hs.employer_response === "passed"
        ? hs.employer_response
        : hs.accepted_at
          ? "accepted"
          : hs.passed_at
            ? "passed"
            : "pending";
    if (response === "accepted") current.accepted_count += 1;
    if (response === "passed") current.passed_count += 1;
    if (hs.billing_status === "free") current.free_match_count += 1;
    if (hs.billing_status === "invoiced") current.invoiced_match_count += 1;
    stats.set(hs.job_posting_id, current);
  }

  return (jobs ?? []).map((job) => {
    const employer = employerMap.get(job.employer_profile_id);
    const user = employer ? userMap.get(employer.user_id) : null;
    const s = stats.get(job.id) ?? {
      match_count: 0,
      accepted_count: 0,
      passed_count: 0,
      free_match_count: 0,
      invoiced_match_count: 0,
    };
    return {
      id: job.id,
      title: job.title,
      status: job.status,
      company_name: job.company_name || employer?.company_name || null,
      employer_name: user?.full_name ?? null,
      employer_email: user?.email ?? null,
      match_count: s.match_count,
      accepted_count: s.accepted_count,
      passed_count: s.passed_count,
      free_match_count: s.free_match_count,
      invoiced_match_count: s.invoiced_match_count,
      location_modes: job.location_modes ?? [],
      global_city: job.global_city,
      pay_type: job.pay_type ?? "annual",
      min_salary: job.min_salary,
      updated_at: job.updated_at,
    };
  });
}

export async function getJobOpeningDetailForAdmin(
  supabase: Supabase,
  jobId: string
): Promise<{
  job: AdminJobOpeningRow & {
    description: string | null;
    verified_skills: string[];
    years_experience: number | null;
    suggested_taglines: string[];
    endorsed_skills: string[];
    timezone: string | null;
    work_hours_start: string | null;
    work_hours_end: string | null;
    visa_statuses: string[];
    kanban_columns: string[];
  };
  matches: AdminJobMatchRow[];
  matchableTalent: {
    id: string;
    headline: string | null;
    full_name: string | null;
    email: string | null;
    status: string;
  }[];
} | null> {
  const { data: job } = await supabase
    .from("job_postings")
    .select(
      "id, title, status, company_name, description, verified_skills, years_experience, suggested_taglines, endorsed_skills, location_modes, global_city, pay_type, min_salary, timezone, work_hours_start, work_hours_end, visa_statuses, kanban_columns, employer_profile_id, updated_at"
    )
    .eq("id", jobId)
    .maybeSingle();

  if (!job) return null;

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("id, user_id, company_name")
    .eq("id", job.employer_profile_id)
    .maybeSingle();

  const { data: employerUser } = employer
    ? await supabase
        .from("user_profiles")
        .select("id, email, full_name")
        .eq("id", employer.user_id)
        .maybeSingle()
    : { data: null };

  type DetailHandshake = {
    id: string;
    talent_profile_id: string;
    match_source: string | null;
    match_index: number | null;
    billing_status: string | null;
    invoice_cycle: number | null;
    employer_response: string | null;
    accepted_at: string | null;
    passed_at: string | null;
    employer_notified_at: string | null;
    linkedin_sent_at: string | null;
    kanban_column: string;
    notes: string | null;
    created_at: string;
  };

  let handshakes: DetailHandshake[] = [];
  const fullHandshakes = await supabase
    .from("match_handshakes")
    .select(
      "id, talent_profile_id, match_source, match_index, billing_status, invoice_cycle, employer_response, accepted_at, passed_at, employer_notified_at, linkedin_sent_at, kanban_column, notes, created_at"
    )
    .eq("job_posting_id", jobId)
    .order("match_index", { ascending: true });
  if (fullHandshakes.error) {
    console.warn(
      "[admin job opening detail handshakes]",
      fullHandshakes.error.message
    );
    const legacy = await supabase
      .from("match_handshakes")
      .select(
        "id, talent_profile_id, is_manual_match, accepted_at, kanban_column, notes, created_at"
      )
      .eq("job_posting_id", jobId)
      .order("created_at", { ascending: true });
    if (!legacy.error) {
      handshakes = (legacy.data ?? []).map((row, index) => ({
        id: row.id,
        talent_profile_id: row.talent_profile_id,
        match_source: row.is_manual_match ? "manual" : "manual",
        match_index: index + 1,
        billing_status: index === 0 ? "free" : "invoiced",
        invoice_cycle: 1,
        employer_response: row.accepted_at ? "accepted" : "pending",
        accepted_at: row.accepted_at,
        passed_at: null,
        employer_notified_at: null,
        linkedin_sent_at: null,
        kanban_column: row.kanban_column,
        notes: row.notes,
        created_at: row.created_at,
      }));
    }
  } else {
    handshakes = (fullHandshakes.data ?? []).map((row) => ({
      id: row.id,
      talent_profile_id: row.talent_profile_id,
      match_source: row.match_source,
      match_index: row.match_index,
      billing_status: row.billing_status,
      invoice_cycle: row.invoice_cycle,
      employer_response: row.employer_response,
      accepted_at: row.accepted_at,
      passed_at: row.passed_at,
      employer_notified_at: row.employer_notified_at,
      linkedin_sent_at: row.linkedin_sent_at,
      kanban_column: row.kanban_column,
      notes: row.notes,
      created_at: row.created_at,
    }));
  }

  const talentIds = [
    ...new Set(handshakes.map((h) => h.talent_profile_id)),
  ];

  const { data: matchedTalent } = talentIds.length
    ? await supabase
        .from("talent_profiles")
        .select("id, user_id, headline, status")
        .in("id", talentIds)
    : { data: [] as { id: string; user_id: string; headline: string | null; status: string }[] };

  const matchedUserIds = [...new Set((matchedTalent ?? []).map((t) => t.user_id))];
  const { data: matchedUsers } = matchedUserIds.length
    ? await supabase
        .from("user_profiles")
        .select("id, full_name")
        .in("id", matchedUserIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const talentMap = new Map((matchedTalent ?? []).map((t) => [t.id, t]));
  const userMap = new Map((matchedUsers ?? []).map((u) => [u.id, u]));

  const matches: AdminJobMatchRow[] = handshakes.map((h, index) => {
    const talent = talentMap.get(h.talent_profile_id);
    const user = talent ? userMap.get(talent.user_id) : null;
    const employerResponse =
      h.employer_response === "accepted" || h.employer_response === "passed"
        ? h.employer_response
        : h.accepted_at
          ? "accepted"
          : h.passed_at
            ? "passed"
            : "pending";
    return {
      id: h.id,
      talent_profile_id: h.talent_profile_id,
      talent_headline: talent?.headline ?? null,
      talent_name: user?.full_name ?? null,
      talent_status: talent?.status ?? "unknown",
      match_source: (h.match_source === "ai" ? "ai" : "manual") as
        | "manual"
        | "ai",
      match_index: h.match_index ?? index + 1,
      billing_status: (h.billing_status === "invoiced" ? "invoiced" : "free") as
        | "free"
        | "invoiced",
      invoice_cycle: h.invoice_cycle ?? 1,
      employer_response: employerResponse,
      accepted: employerResponse === "accepted",
      accepted_at: h.accepted_at,
      passed_at: h.passed_at,
      employer_notified_at: h.employer_notified_at,
      linkedin_sent_at: h.linkedin_sent_at,
      kanban_column: h.kanban_column,
      notes: h.notes,
      created_at: h.created_at,
    };
  });

  const free = matches.filter((m) => m.billing_status === "free").length;
  const invoiced = matches.filter((m) => m.billing_status === "invoiced").length;
  const acceptedCount = matches.filter(
    (m) => m.employer_response === "accepted"
  ).length;
  const passedCount = matches.filter(
    (m) => m.employer_response === "passed"
  ).length;

  const { data: matchable } = await supabase
    .from("talent_profiles")
    .select("id, user_id, headline, status")
    .in("status", ["actively_looking", "on_hold"])
    .order("updated_at", { ascending: false });

  const alreadyMatched = new Set(matches.map((m) => m.talent_profile_id));
  const available = (matchable ?? []).filter(
    (t) => isMatchableTalentStatus(t.status) && !alreadyMatched.has(t.id)
  );
  const availableUserIds = [...new Set(available.map((t) => t.user_id))];
  const { data: availableUsers } = availableUserIds.length
    ? await supabase
        .from("user_profiles")
        .select("id, email, full_name")
        .in("id", availableUserIds)
    : {
        data: [] as {
          id: string;
          email: string | null;
          full_name: string | null;
        }[],
      };
  const availableUserMap = new Map(
    (availableUsers ?? []).map((u) => [u.id, u])
  );

  return {
    job: {
      id: job.id,
      title: job.title,
      status: job.status,
      company_name: job.company_name || employer?.company_name || null,
      employer_name: employerUser?.full_name ?? null,
      employer_email: employerUser?.email ?? null,
      match_count: matches.length,
      accepted_count: acceptedCount,
      passed_count: passedCount,
      free_match_count: free,
      invoiced_match_count: invoiced,
      location_modes: job.location_modes ?? [],
      global_city: job.global_city,
      pay_type: job.pay_type ?? "annual",
      min_salary: job.min_salary,
      updated_at: job.updated_at,
      description: job.description,
      verified_skills: asStringArray(job.verified_skills),
      years_experience: job.years_experience,
      suggested_taglines: asStringArray(job.suggested_taglines),
      endorsed_skills: asStringArray(job.endorsed_skills),
      timezone: job.timezone,
      work_hours_start: job.work_hours_start,
      work_hours_end: job.work_hours_end,
      visa_statuses: job.visa_statuses ?? [],
      kanban_columns: asStringArray(job.kanban_columns),
    },
    matches,
    matchableTalent: available.map((t) => {
      const user = availableUserMap.get(t.user_id);
      return {
        id: t.id,
        headline: t.headline,
        full_name: user?.full_name ?? null,
        email: user?.email ?? null,
        status: t.status,
      };
    }),
  };
}
