import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type AdminDashboardData,
  type ChartRangeKey,
  type PipelineStatus,
  type SparkPoint,
  MATCH_TARGETS,
  RANGE_COPY,
  buildPipelineSegments,
  emptyPipelineCounts,
  getRangeBounds,
  mapTalentToPipelineStatus,
  percentChange,
} from "@/lib/dashboard/admin-metrics";
import type { Database } from "@/types/database";

type AppSupabase = SupabaseClient<Database>;

const PAGE_SIZE = 1000;

async function fetchAllRows<T>(
  loadPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await loadPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

function iso(date: Date) {
  return date.toISOString();
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDayLabel(date: Date) {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

/** Build a daily sparkline from timestamped events within [from, to). */
export function buildDailySparkline(
  timestamps: string[],
  from: Date,
  to: Date
): SparkPoint[] {
  const start = startOfUtcDay(from);
  const end = startOfUtcDay(to);
  const counts = new Map<string, number>();

  for (const stamp of timestamps) {
    const day = startOfUtcDay(new Date(stamp));
    if (day < start || day > end) continue;
    const key = day.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const points: SparkPoint[] = [];
  for (let cursor = start; cursor <= end; cursor = addUtcDays(cursor, 1)) {
    const key = cursor.toISOString().slice(0, 10);
    points.push({
      day: formatDayLabel(cursor),
      views: counts.get(key) ?? 0,
    });
  }

  // Keep sparklines readable for long ranges by sampling.
  if (points.length <= 32) return points;
  const bucketSize = Math.ceil(points.length / 26);
  const sampled: SparkPoint[] = [];
  for (let i = 0; i < points.length; i += bucketSize) {
    const slice = points.slice(i, i + bucketSize);
    sampled.push({
      day: slice[0]?.day ?? `B${sampled.length + 1}`,
      views: slice.reduce((sum, p) => sum + p.views, 0),
    });
  }
  return sampled;
}

function countRegistrationsByRole(
  rows: { role: string }[]
): { total: number; talent: number; employers: number } {
  let talent = 0;
  let employers = 0;
  for (const row of rows) {
    const role = row.role.trim().toLowerCase();
    if (role === "talent" || role === "both" || role === "staff") talent += 1;
    if (role === "employer" || role === "both") employers += 1;
  }
  return { total: rows.length, talent, employers };
}

/** MatchLever production project — used when system/env IDs are absent (e.g. local). */
const MATCHLEVER_PROJECT_ID = "prj_9l9hC8JM6wff2v9n1jpaoGkQdMwt";
const MATCHLEVER_TEAM_ID = "team_AmzLdp2FptSTXdDRQUFJBQDT";

function analyticsGranularity(range: ChartRangeKey): {
  by: "day" | "week" | "month";
  limit: number;
} {
  if (range === "30d") return { by: "day", limit: 32 };
  if (range === "180d") return { by: "week", limit: 30 };
  if (range === "1y") return { by: "week", limit: 53 };
  return { by: "month", limit: 36 };
}

function formatAnalyticsBucketLabel(timestamp: string, by: "day" | "week" | "month") {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  if (by === "month") {
    return `${date.getUTCMonth() + 1}/${String(date.getUTCFullYear()).slice(2)}`;
  }
  return formatDayLabel(date);
}

async function fetchVisitorVolume(args: {
  range: ChartRangeKey;
  from: Date;
  to: Date;
  periodLabel: string;
  /** Fallback timestamps when Web Analytics is unavailable (site inbound events). */
  inboundTimestamps: string[];
}): Promise<AdminDashboardData["visitorVolume"]> {
  const analytics = await fetchVercelWebAnalytics(
    args.from,
    args.to,
    args.range
  );
  if (analytics) {
    return {
      label: "Visitor Volume",
      total: analytics.total,
      periodLabel: args.periodLabel,
      sparkline: analytics.sparkline,
      available: true,
    };
  }

  // Fallback: real inbound website activity we already store (contacts + signups).
  const sparkline = buildDailySparkline(
    args.inboundTimestamps,
    args.from,
    args.to
  );
  const total = sparkline.reduce((sum, point) => sum + point.views, 0);
  return {
    label: "Visitor Volume",
    total,
    periodLabel: args.periodLabel,
    sparkline,
    available: true,
    unavailableReason:
      "Showing contacts + new signups until VERCEL_API_TOKEN is configured for Web Analytics.",
  };
}

async function fetchVercelWebAnalytics(
  from: Date,
  to: Date,
  range: ChartRangeKey
): Promise<{ total: number; sparkline: SparkPoint[] } | null> {
  const token =
    process.env.VERCEL_API_TOKEN?.trim() ||
    process.env.VERCEL_TOKEN?.trim() ||
    "";
  const projectId =
    process.env.VERCEL_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_ID?.trim() ||
    MATCHLEVER_PROJECT_ID;
  const teamId =
    process.env.VERCEL_TEAM_ID?.trim() || MATCHLEVER_TEAM_ID;

  if (!token) return null;

  const { by, limit } = analyticsGranularity(range);
  const since = from.toISOString();
  const until = to.toISOString();
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const countParams = new URLSearchParams({
      projectId,
      teamId,
      since,
      until,
    });
    const aggregateParams = new URLSearchParams({
      projectId,
      teamId,
      since,
      until,
      by,
      limit: String(limit),
    });

    const [countRes, aggregateRes] = await Promise.all([
      fetch(
        `https://api.vercel.com/v1/query/web-analytics/visits/count?${countParams}`,
        { headers, cache: "no-store" }
      ),
      fetch(
        `https://api.vercel.com/v1/query/web-analytics/visits/aggregate?${aggregateParams}`,
        { headers, cache: "no-store" }
      ),
    ]);

    if (!countRes.ok && !aggregateRes.ok) {
      console.error(
        "[admin-dashboard] Web Analytics query failed",
        countRes.status,
        aggregateRes.status
      );
      return null;
    }

    let total = 0;
    if (countRes.ok) {
      const countJson = (await countRes.json()) as {
        data?: { pageviews?: number; visitors?: number };
      };
      total = Number(countJson.data?.pageviews ?? 0);
    }

    let sparkline: SparkPoint[] = [];
    if (aggregateRes.ok) {
      const aggregateJson = (await aggregateRes.json()) as {
        data?: Array<{
          timestamp?: string;
          pageviews?: number;
          visitors?: number;
        }>;
      };
      const rows = (aggregateJson.data ?? []).filter(
        (row) => typeof row.timestamp === "string"
      );
      sparkline = rows.map((row, index) => ({
        day: formatAnalyticsBucketLabel(row.timestamp!, by) || `D${index + 1}`,
        views: Number(row.pageviews ?? 0),
      }));
      if (!countRes.ok) {
        total = sparkline.reduce((sum, point) => sum + point.views, 0);
      }
    }

    if (!sparkline.length && total === 0) {
      // Analytics enabled but no traffic in range — still a successful query.
      return { total: 0, sparkline: [] };
    }

    return { total, sparkline };
  } catch (error) {
    console.error("[admin-dashboard] Web Analytics query error", error);
    return null;
  }
}

export async function buildAdminDashboardData(
  supabase: AppSupabase,
  range: ChartRangeKey
): Promise<AdminDashboardData> {
  const copy = RANGE_COPY[range];
  const { from, to, priorFrom, priorTo } = getRangeBounds(range);
  const fromIso = iso(from);
  const toIso = iso(to);
  const priorFromIso = iso(priorFrom);
  const priorToIso = iso(priorTo);

  const [
    currentUsers,
    priorUsers,
    contactCurrent,
    talentRows,
    referenceRows,
    placedRows,
    matchCurrent,
  ] = await Promise.all([
    fetchAllRows<{ role: string; created_at: string }>((start, end) =>
      supabase
        .from("user_profiles")
        .select("role, created_at")
        .gte("created_at", fromIso)
        .lt("created_at", toIso)
        .order("created_at", { ascending: true })
        .range(start, end)
    ),
    fetchAllRows<{ role: string }>((start, end) =>
      supabase
        .from("user_profiles")
        .select("role")
        .gte("created_at", priorFromIso)
        .lt("created_at", priorToIso)
        .range(start, end)
    ),
    fetchAllRows<{ created_at: string }>((start, end) =>
      supabase
        .from("contact_requests")
        .select("created_at")
        .gte("created_at", fromIso)
        .lt("created_at", toIso)
        .order("created_at", { ascending: true })
        .range(start, end)
    ),
    fetchAllRows<{
      id: string;
      user_id: string;
      status: string;
      headline: string | null;
      global_city: string | null;
      global_country: string | null;
      work_hours_start: string | null;
      work_hours_end: string | null;
      raw_resume_text: string | null;
      sanitized_summary: string | null;
    }>((start, end) =>
      supabase
        .from("talent_profiles")
        .select(
          "id, user_id, status, headline, global_city, global_country, work_hours_start, work_hours_end, raw_resume_text, sanitized_summary"
        )
        .order("created_at", { ascending: true })
        .range(start, end)
    ),
    fetchAllRows<{ talent_profile_id: string; status: string }>((start, end) =>
      supabase
        .from("talent_references")
        .select("talent_profile_id, status")
        .range(start, end)
    ),
    fetchAllRows<{ talent_profile_id: string }>((start, end) =>
      supabase
        .from("match_handshakes")
        .select("talent_profile_id")
        .eq("kanban_column", "hired")
        .range(start, end)
    ),
    fetchAllRows<{ id: string }>((start, end) =>
      supabase
        .from("match_handshakes")
        .select("id")
        .gte("created_at", fromIso)
        .lt("created_at", toIso)
        .range(start, end)
    ),
  ]);

  const currentRegs = countRegistrationsByRole(currentUsers);
  const priorRegs = countRegistrationsByRole(priorUsers);

  const verifiedByTalent = new Map<string, number>();
  for (const ref of referenceRows) {
    if (ref.status !== "verified") continue;
    verifiedByTalent.set(
      ref.talent_profile_id,
      (verifiedByTalent.get(ref.talent_profile_id) ?? 0) + 1
    );
  }

  const placedTalentIds = new Set(placedRows.map((row) => row.talent_profile_id));
  const pipelineCounts = emptyPipelineCounts();

  for (const talent of talentRows) {
    const bucket: PipelineStatus = mapTalentToPipelineStatus({
      hasTalentProfile: true,
      status: talent.status,
      headline: talent.headline,
      globalCity: talent.global_city,
      globalCountry: talent.global_country,
      workHoursStart: talent.work_hours_start,
      workHoursEnd: talent.work_hours_end,
      rawResumeText: talent.raw_resume_text,
      sanitizedSummary: talent.sanitized_summary,
      verifiedReferenceCount: verifiedByTalent.get(talent.id) ?? 0,
      isPlaced: placedTalentIds.has(talent.id),
    });
    pipelineCounts[bucket] += 1;
  }

  const segments = buildPipelineSegments(pipelineCounts);
  const matchesInPeriod = matchCurrent.length;
  const periodTarget = MATCH_TARGETS[range];

  const inboundTimestamps = [
    ...currentUsers.map((row) => row.created_at),
    ...contactCurrent.map((row) => row.created_at),
  ];

  const visitorVolume = await fetchVisitorVolume({
    range,
    from,
    to,
    periodLabel: copy.periodLabel,
    inboundTimestamps,
  });

  return {
    range,
    generatedAt: new Date().toISOString(),
    demo: false,
    visitorVolume,
    newRegistrations: {
      label: "New Registrations",
      total: currentRegs.total,
      talent: currentRegs.talent,
      employers: currentRegs.employers,
      changePct: percentChange(currentRegs.total, priorRegs.total),
      changeLabel: copy.changeLabel,
      periodLabel: copy.periodLabel,
    },
    talentPipeline: {
      label: "Talent Pipeline",
      segments,
      total: segments.reduce((sum, segment) => sum + segment.count, 0),
      periodLabel: "Current snapshot",
    },
    activeMatches: {
      label: "Active Matches",
      matchesInPeriod,
      periodTarget,
      periodProgress: matchesInPeriod,
      periodLabel: copy.periodLabel,
      targetLabel: copy.targetLabel,
    },
  };
}
