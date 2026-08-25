import { computeTalentMissing } from "@/lib/admin/demo";
import { REQUIRED_VERIFIED_REFERENCES } from "@/lib/dashboard/talent";

export type ChartRangeKey = "30d" | "180d" | "1y" | "lifetime";

export type SparkPoint = {
  day: string;
  views: number;
};

export type PipelineStatus =
  | "Draft"
  | "Pending Review"
  | "Active"
  | "Placed";

export type PipelineSegment = {
  status: PipelineStatus;
  count: number;
  color: string;
};

export type VisitorVolumeMetric = {
  label: string;
  /** Total views in the selected range. */
  total: number;
  periodLabel: string;
  sparkline: SparkPoint[];
  /** False when Web Analytics API token is missing / unavailable. */
  available?: boolean;
  unavailableReason?: string;
};

export type NewRegistrationsMetric = {
  label: string;
  total: number;
  talent: number;
  employers: number;
  /** Percent change vs the previous equivalent period. */
  changePct: number;
  changeLabel: string;
  periodLabel: string;
};

export type TalentPipelineMetric = {
  label: string;
  segments: PipelineSegment[];
  total: number;
  periodLabel: string;
};

export type ActiveMatchesMetric = {
  label: string;
  matchesInPeriod: number;
  periodTarget: number;
  periodProgress: number;
  periodLabel: string;
  targetLabel: string;
};

export type AdminDashboardData = {
  range: ChartRangeKey;
  generatedAt: string;
  demo?: boolean;
  visitorVolume: VisitorVolumeMetric;
  newRegistrations: NewRegistrationsMetric;
  talentPipeline: TalentPipelineMetric;
  activeMatches: ActiveMatchesMetric;
};

export const CHART_RANGE_OPTIONS: ReadonlyArray<{
  value: ChartRangeKey;
  label: string;
  shortLabel: string;
}> = [
  { value: "30d", label: "30 days", shortLabel: "30D" },
  { value: "180d", label: "180 days", shortLabel: "180D" },
  { value: "1y", label: "1 year", shortLabel: "1Y" },
  { value: "lifetime", label: "Lifetime", shortLabel: "Life" },
];

export const PIPELINE_COLORS: Record<PipelineStatus, string> = {
  Draft: "#94A3B8",
  "Pending Review": "#C4922A",
  Active: "#2B5B84",
  Placed: "#2F6F4E",
};

export const MATCH_TARGETS: Record<ChartRangeKey, number> = {
  "30d": 45,
  "180d": 200,
  "1y": 480,
  lifetime: 1000,
};

export const RANGE_COPY: Record<
  ChartRangeKey,
  {
    periodLabel: string;
    changeLabel: string;
    targetLabel: string;
  }
> = {
  "30d": {
    periodLabel: "Last 30 days",
    changeLabel: "vs prior 30 days",
    targetLabel: "30-day target",
  },
  "180d": {
    periodLabel: "Last 180 days",
    changeLabel: "vs prior 180 days",
    targetLabel: "180-day target",
  },
  "1y": {
    periodLabel: "Last 12 months",
    changeLabel: "vs prior year",
    targetLabel: "Annual target",
  },
  lifetime: {
    periodLabel: "Lifetime",
    changeLabel: "vs prior half of lifetime",
    targetLabel: "Lifetime goal",
  },
};

export function parseChartRangeKey(value: string | null | undefined): ChartRangeKey {
  if (value === "180d" || value === "1y" || value === "lifetime") return value;
  return "30d";
}

export function getRangeBounds(
  range: ChartRangeKey,
  now = new Date()
): {
  from: Date;
  to: Date;
  priorFrom: Date;
  priorTo: Date;
  dayCount: number | null;
} {
  const to = now;
  const msDay = 86_400_000;

  if (range === "lifetime") {
    const from = new Date("2024-01-01T00:00:00.000Z");
    const span = Math.max(msDay, to.getTime() - from.getTime());
    const mid = new Date(from.getTime() + span / 2);
    return {
      from,
      to,
      priorFrom: from,
      priorTo: mid,
      dayCount: null,
    };
  }

  const days = range === "30d" ? 30 : range === "180d" ? 180 : 365;
  const from = new Date(to.getTime() - days * msDay);
  const priorTo = from;
  const priorFrom = new Date(from.getTime() - days * msDay);
  return { from, to, priorFrom, priorTo, dayCount: days };
}

export function buildPipelineSegments(
  counts: Record<PipelineStatus, number>
): PipelineSegment[] {
  return (["Draft", "Pending Review", "Active", "Placed"] as const).map(
    (status) => ({
      status,
      count: counts[status] ?? 0,
      color: PIPELINE_COLORS[status],
    })
  );
}

export function mapTalentToPipelineStatus(input: {
  hasTalentProfile: boolean;
  status: string;
  headline: string | null;
  globalCity: string | null;
  globalCountry: string | null;
  workHoursStart: string | null;
  workHoursEnd: string | null;
  rawResumeText: string | null;
  sanitizedSummary: string | null;
  verifiedReferenceCount: number;
  isPlaced: boolean;
}): PipelineStatus {
  if (input.isPlaced) return "Placed";

  const missing = computeTalentMissing({
    has_talent_profile: input.hasTalentProfile,
    headline: input.headline,
    global_city: input.globalCity,
    global_country: input.globalCountry,
    work_hours_start: input.workHoursStart,
    work_hours_end: input.workHoursEnd,
    raw_resume_text: input.rawResumeText,
    sanitized_summary: input.sanitizedSummary,
    references: Array.from({ length: input.verifiedReferenceCount }, () => ({
      status: "verified",
    })),
  });

  if (
    input.status === "actively_looking" &&
    !missing.resume &&
    !missing.profile &&
    !missing.references
  ) {
    return "Active";
  }

  if (!missing.resume && !missing.profile && missing.references) {
    return "Pending Review";
  }

  return "Draft";
}

export function percentChange(current: number, prior: number): number {
  if (prior <= 0) return current > 0 ? 100 : 0;
  return ((current - prior) / prior) * 100;
}

export function emptyPipelineCounts(): Record<PipelineStatus, number> {
  return {
    Draft: 0,
    "Pending Review": 0,
    Active: 0,
    Placed: 0,
  };
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSparkline(
  range: ChartRangeKey,
  base: number,
  volatility: number
): SparkPoint[] {
  const rand = mulberry32(hashSeed(`views:${range}`));
  const configs: Record<
    ChartRangeKey,
    { points: number; label: (i: number) => string }
  > = {
    "30d": {
      points: 30,
      label: (i) => `D${i + 1}`,
    },
    "180d": {
      points: 26,
      label: (i) => `W${i + 1}`,
    },
    "1y": {
      points: 12,
      label: (i) =>
        ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i] ??
        `M${i + 1}`,
    },
    lifetime: {
      points: 16,
      label: (i) => `Q${i + 1}`,
    },
  };

  const { points, label } = configs[range];
  const out: SparkPoint[] = [];
  let value = base;
  for (let i = 0; i < points; i += 1) {
    value = Math.max(40, value + (rand() - 0.45) * volatility);
    out.push({ day: label(i), views: Math.round(value) });
  }
  return out;
}

type RangeScale = {
  viewsTotal: number;
  viewsBase: number;
  viewsVol: number;
  registrations: number;
  talentShare: number;
  changePct: number;
  draft: number;
  pending: number;
  active: number;
  placed: number;
  matches: number;
  matchTarget: number;
};

const RANGE_SCALE: Record<ChartRangeKey, RangeScale> = {
  "30d": {
    viewsTotal: 58_420,
    viewsBase: 1700,
    viewsVol: 320,
    registrations: 214,
    talentShare: 0.68,
    changePct: 8.4,
    draft: 42,
    pending: 28,
    active: 67,
    placed: 19,
    matches: 38,
    matchTarget: 45,
  },
  "180d": {
    viewsTotal: 312_800,
    viewsBase: 9800,
    viewsVol: 1800,
    registrations: 1180,
    talentShare: 0.71,
    changePct: 14.2,
    draft: 58,
    pending: 41,
    active: 124,
    placed: 63,
    matches: 186,
    matchTarget: 200,
  },
  "1y": {
    viewsTotal: 641_200,
    viewsBase: 48_000,
    viewsVol: 9000,
    registrations: 2480,
    talentShare: 0.69,
    changePct: 22.6,
    draft: 71,
    pending: 52,
    active: 198,
    placed: 112,
    matches: 412,
    matchTarget: 480,
  },
  lifetime: {
    viewsTotal: 1_284_500,
    viewsBase: 62_000,
    viewsVol: 12_000,
    registrations: 5120,
    talentShare: 0.7,
    changePct: 31.1,
    draft: 86,
    pending: 64,
    active: 246,
    placed: 168,
    matches: 890,
    matchTarget: 1000,
  },
};

/** Typed mock snapshot for the selected chart range (demo / no Supabase). */
export function getAdminDashboardMock(
  range: ChartRangeKey = "30d"
): AdminDashboardData {
  const scale = RANGE_SCALE[range];
  const copy = RANGE_COPY[range];
  const talent = Math.round(scale.registrations * scale.talentShare);
  const employers = scale.registrations - talent;
  const segments = buildPipelineSegments({
    Draft: scale.draft,
    "Pending Review": scale.pending,
    Active: scale.active,
    Placed: scale.placed,
  });

  return {
    range,
    generatedAt: new Date().toISOString(),
    demo: true,
    visitorVolume: {
      label: "Visitor Volume",
      total: scale.viewsTotal,
      periodLabel: copy.periodLabel,
      sparkline: buildSparkline(range, scale.viewsBase, scale.viewsVol),
      available: true,
    },
    newRegistrations: {
      label: "New Registrations",
      total: scale.registrations,
      talent,
      employers,
      changePct: scale.changePct,
      changeLabel: copy.changeLabel,
      periodLabel: copy.periodLabel,
    },
    talentPipeline: {
      label: "Talent Pipeline",
      segments,
      total: segments.reduce((sum, s) => sum + s.count, 0),
      periodLabel: "Current snapshot",
    },
    activeMatches: {
      label: "Active Matches",
      matchesInPeriod: scale.matches,
      periodTarget: scale.matchTarget,
      periodProgress: scale.matches,
      periodLabel: copy.periodLabel,
      targetLabel: copy.targetLabel,
    },
  };
}

export { REQUIRED_VERIFIED_REFERENCES };
