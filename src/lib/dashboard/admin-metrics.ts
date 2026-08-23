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
};

export type NewRegistrationsMetric = {
  label: string;
  total: number;
  candidates: number;
  employers: number;
  /** Percent change vs the previous equivalent period. */
  changePct: number;
  changeLabel: string;
  periodLabel: string;
};

export type CandidatePipelineMetric = {
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
  visitorVolume: VisitorVolumeMetric;
  newRegistrations: NewRegistrationsMetric;
  candidatePipeline: CandidatePipelineMetric;
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

const PIPELINE_COLORS: Record<PipelineStatus, string> = {
  Draft: "#94A3B8",
  "Pending Review": "#C4922A",
  Active: "#2B5B84",
  Placed: "#2F6F4E",
};

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

const RANGE_COPY: Record<
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

type RangeScale = {
  viewsTotal: number;
  viewsBase: number;
  viewsVol: number;
  registrations: number;
  candidateShare: number;
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
    candidateShare: 0.68,
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
    candidateShare: 0.71,
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
    candidateShare: 0.69,
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
    candidateShare: 0.7,
    changePct: 31.1,
    draft: 86,
    pending: 64,
    active: 246,
    placed: 168,
    matches: 890,
    matchTarget: 1000,
  },
};

/** Typed mock snapshot for the selected chart range. */
export function getAdminDashboardMock(
  range: ChartRangeKey = "30d"
): AdminDashboardData {
  const scale = RANGE_SCALE[range];
  const copy = RANGE_COPY[range];
  const candidates = Math.round(scale.registrations * scale.candidateShare);
  const employers = scale.registrations - candidates;
  const segments: PipelineSegment[] = [
    { status: "Draft", count: scale.draft, color: PIPELINE_COLORS.Draft },
    {
      status: "Pending Review",
      count: scale.pending,
      color: PIPELINE_COLORS["Pending Review"],
    },
    { status: "Active", count: scale.active, color: PIPELINE_COLORS.Active },
    { status: "Placed", count: scale.placed, color: PIPELINE_COLORS.Placed },
  ];

  return {
    range,
    generatedAt: new Date().toISOString(),
    visitorVolume: {
      label: "Visitor Volume",
      total: scale.viewsTotal,
      periodLabel: copy.periodLabel,
      sparkline: buildSparkline(range, scale.viewsBase, scale.viewsVol),
    },
    newRegistrations: {
      label: "New Registrations",
      total: scale.registrations,
      candidates,
      employers,
      changePct: scale.changePct,
      changeLabel: copy.changeLabel,
      periodLabel: copy.periodLabel,
    },
    candidatePipeline: {
      label: "Candidate Pipeline",
      segments,
      total: segments.reduce((sum, s) => sum + s.count, 0),
      periodLabel: copy.periodLabel,
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
