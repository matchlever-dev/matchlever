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
      "id, title, status, company_name, location_modes, global_city, min_salary, employer_profile_id, updated_at"
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const employerIds = [
    ...new Set((jobs ?? []).map((j) => j.employer_profile_id)),
  ];
  const jobIds = (jobs ?? []).map((j) => j.id);

  const [{ data: employers }, { data: handshakes }] = await Promise.all([
    employerIds.length
      ? supabase
          .from("employer_profiles")
          .select("id, user_id, company_name")
          .in("id", employerIds)
      : Promise.resolve({ data: [] as { id: string; user_id: string; company_name: string }[] }),
    jobIds.length
      ? supabase
          .from("match_handshakes")
          .select("id, job_posting_id, billing_status, accepted_at")
          .in("job_posting_id", jobIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            job_posting_id: string;
            billing_status: string;
            accepted_at: string | null;
          }[],
        }),
  ]);

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
      free_match_count: number;
      invoiced_match_count: number;
    }
  >();

  for (const hs of handshakes ?? []) {
    const current = stats.get(hs.job_posting_id) ?? {
      match_count: 0,
      accepted_count: 0,
      free_match_count: 0,
      invoiced_match_count: 0,
    };
    current.match_count += 1;
    if (hs.accepted_at) current.accepted_count += 1;
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
      free_match_count: s.free_match_count,
      invoiced_match_count: s.invoiced_match_count,
      location_modes: job.location_modes ?? [],
      global_city: job.global_city,
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
      "id, title, status, company_name, description, verified_skills, years_experience, suggested_taglines, endorsed_skills, location_modes, global_city, min_salary, timezone, work_hours_start, work_hours_end, visa_statuses, kanban_columns, employer_profile_id, updated_at"
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

  const { data: handshakes } = await supabase
    .from("match_handshakes")
    .select(
      "id, talent_profile_id, match_source, match_index, billing_status, invoice_cycle, accepted_at, employer_notified_at, linkedin_sent_at, kanban_column, notes, created_at"
    )
    .eq("job_posting_id", jobId)
    .order("match_index", { ascending: true });

  const talentIds = [
    ...new Set((handshakes ?? []).map((h) => h.talent_profile_id)),
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

  const matches: AdminJobMatchRow[] = (handshakes ?? []).map((h) => {
    const talent = talentMap.get(h.talent_profile_id);
    const user = talent ? userMap.get(talent.user_id) : null;
    return {
      id: h.id,
      talent_profile_id: h.talent_profile_id,
      talent_headline: talent?.headline ?? null,
      talent_name: user?.full_name ?? null,
      talent_status: talent?.status ?? "unknown",
      match_source: (h.match_source === "ai" ? "ai" : "manual") as
        | "manual"
        | "ai",
      match_index: h.match_index,
      billing_status: (h.billing_status === "invoiced" ? "invoiced" : "free") as
        | "free"
        | "invoiced",
      invoice_cycle: h.invoice_cycle,
      accepted: Boolean(h.accepted_at),
      accepted_at: h.accepted_at,
      employer_notified_at: h.employer_notified_at,
      linkedin_sent_at: h.linkedin_sent_at,
      kanban_column: h.kanban_column,
      notes: h.notes,
      created_at: h.created_at,
    };
  });

  const free = matches.filter((m) => m.billing_status === "free").length;
  const invoiced = matches.filter((m) => m.billing_status === "invoiced").length;

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
      accepted_count: matches.filter((m) => m.accepted).length,
      free_match_count: free,
      invoiced_match_count: invoiced,
      location_modes: job.location_modes ?? [],
      global_city: job.global_city,
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
