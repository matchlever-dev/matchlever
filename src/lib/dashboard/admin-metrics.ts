export type DateRangeKey = "today" | "7d" | "30d";

export type HealthStatus = "healthy" | "watch" | "critical";

export type SparkPoint = {
  t: string;
  v: number;
};

export type MetricSection =
  | "users"
  | "health"
  | "conversions"
  | "revenue";

export type StatMetric = {
  id: string;
  section: MetricSection;
  label: string;
  value: string;
  unit?: string;
  /** Positive = up vs prior period. */
  deltaPct: number;
  health: HealthStatus;
  sparkline: SparkPoint[];
  subtitle?: string;
};

export type SystemAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  count?: number;
};

export type AdminDashboardSnapshot = {
  range: DateRangeKey;
  generatedAt: string;
  metrics: StatMetric[];
  alerts: SystemAlert[];
};

export const DATE_RANGE_OPTIONS: ReadonlyArray<{
  value: DateRangeKey;
  label: string;
}> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
];

export const SECTION_META: Record<
  MetricSection,
  { title: string; description: string }
> = {
  users: {
    title: "Active Users",
    description: "Real-time presence and engagement trend",
  },
  health: {
    title: "System Health",
    description: "Core Web Vitals and error-rate dials",
  },
  conversions: {
    title: "Core Conversions",
    description: "DAU target, match volume, and signup funnel",
  },
  revenue: {
    title: "Revenue & Safety",
    description: "Daily revenue, ARR pulse, and moderation queue",
  },
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

function sparkline(
  seedKey: string,
  points: number,
  base: number,
  volatility: number
): SparkPoint[] {
  const rand = mulberry32(hashSeed(seedKey));
  const out: SparkPoint[] = [];
  let value = base;
  for (let i = 0; i < points; i += 1) {
    value = Math.max(0, value + (rand() - 0.48) * volatility);
    out.push({ t: String(i), v: Math.round(value * 10) / 10 });
  }
  return out;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 100) / 10}k`;
  return `$${Math.round(n)}`;
}

const RANGE_POINTS: Record<DateRangeKey, number> = {
  today: 24,
  "7d": 28,
  "30d": 30,
};

const RANGE_SCALE: Record<DateRangeKey, number> = {
  today: 1,
  "7d": 1.08,
  "30d": 1.18,
};

/**
 * Deterministic mock ops metrics for the Admin Dashboard.
 * Swap for live API payloads later without changing card components.
 */
export function buildAdminDashboardSnapshot(
  range: DateRangeKey,
  refreshToken = 0
): AdminDashboardSnapshot {
  const scale = RANGE_SCALE[range];
  const points = RANGE_POINTS[range];
  const seed = `${range}:${refreshToken}`;

  const activeUsers = Math.round(1280 * scale + refreshToken * 3);
  const cwvPass = Math.min(99.2, 91.5 + scale * 3.2 - (refreshToken % 3) * 0.4);
  const errorRate = Math.max(0.08, 0.42 / scale + (refreshToken % 5) * 0.02);
  const dau = Math.round(940 * scale);
  const dauTarget = 1100;
  const matchVolume = Math.round(186 * scale + refreshToken);
  const signupConv = Math.min(28, 14.2 * scale + (refreshToken % 4) * 0.3);
  const revenueToday = Math.round(4200 * scale + refreshToken * 40);
  const arr = Math.round(1_280_000 * scale);
  const flagged = Math.max(0, 7 - (refreshToken % 4) + (range === "30d" ? 4 : 0));

  const metrics: StatMetric[] = [
    {
      id: "active-users",
      section: "users",
      label: "Active users",
      value: formatCompact(activeUsers),
      deltaPct: range === "today" ? 4.2 : range === "7d" ? 6.8 : 11.4,
      health: "healthy",
      subtitle: "Real-time · last 15 min",
      sparkline: sparkline(`${seed}:users`, points, activeUsers * 0.82, activeUsers * 0.06),
    },
    {
      id: "cwv-pass",
      section: "health",
      label: "CWV pass rate",
      value: cwvPass.toFixed(1),
      unit: "%",
      deltaPct: range === "today" ? 0.8 : 1.6,
      health: cwvPass >= 90 ? "healthy" : cwvPass >= 80 ? "watch" : "critical",
      subtitle: "LCP / INP / CLS aggregate",
      sparkline: sparkline(`${seed}:cwv`, points, cwvPass - 2, 1.4),
    },
    {
      id: "error-5xx",
      section: "health",
      label: "5xx error rate",
      value: errorRate.toFixed(2),
      unit: "%",
      deltaPct: range === "today" ? -12.5 : -8.1,
      health: errorRate <= 0.5 ? "healthy" : errorRate <= 1.2 ? "watch" : "critical",
      subtitle: "API + edge functions",
      sparkline: sparkline(`${seed}:5xx`, points, errorRate + 0.2, 0.15),
    },
    {
      id: "dau-target",
      section: "conversions",
      label: "DAU vs target",
      value: `${formatCompact(dau)} / ${formatCompact(dauTarget)}`,
      deltaPct: ((dau - dauTarget) / dauTarget) * 100,
      health: dau / dauTarget >= 0.9 ? "healthy" : dau / dauTarget >= 0.75 ? "watch" : "critical",
      subtitle: `${Math.round((dau / dauTarget) * 100)}% of target`,
      sparkline: sparkline(`${seed}:dau`, points, dau * 0.9, dau * 0.05),
    },
    {
      id: "match-volume",
      section: "conversions",
      label: "Match / action volume",
      value: formatCompact(matchVolume),
      deltaPct: range === "today" ? 3.1 : 9.4,
      health: "healthy",
      subtitle: "Manual + concierge matches",
      sparkline: sparkline(`${seed}:match`, points, matchVolume * 0.85, matchVolume * 0.08),
    },
    {
      id: "signup-conv",
      section: "conversions",
      label: "Signup conversion",
      value: signupConv.toFixed(1),
      unit: "%",
      deltaPct: range === "today" ? 1.2 : 2.7,
      health: signupConv >= 16 ? "healthy" : signupConv >= 12 ? "watch" : "critical",
      subtitle: "Visit → candidate start",
      sparkline: sparkline(`${seed}:signup`, points, signupConv - 1, 0.8),
    },
    {
      id: "revenue-today",
      section: "revenue",
      label: range === "today" ? "Today's revenue" : "Period revenue",
      value: formatCurrency(revenueToday * (range === "today" ? 1 : range === "7d" ? 6.2 : 24)),
      deltaPct: range === "today" ? 5.6 : 8.9,
      health: "healthy",
      subtitle: "Unlock fees + retainers",
      sparkline: sparkline(`${seed}:rev`, points, revenueToday * 0.7, revenueToday * 0.12),
    },
    {
      id: "arr",
      section: "revenue",
      label: "ARR pulse",
      value: formatCurrency(arr),
      deltaPct: 2.4,
      health: "healthy",
      subtitle: "Annualized run-rate",
      sparkline: sparkline(`${seed}:arr`, points, arr / 30, arr / 400),
    },
    {
      id: "flagged-queue",
      section: "revenue",
      label: "Flagged content queue",
      value: String(flagged),
      deltaPct: flagged > 8 ? 18 : flagged > 4 ? 4 : -22,
      health: flagged <= 3 ? "healthy" : flagged <= 8 ? "watch" : "critical",
      subtitle: "Safety review backlog",
      sparkline: sparkline(`${seed}:flag`, points, flagged + 2, 1.2),
    },
  ];

  const alerts: SystemAlert[] = [
    ...(errorRate > 0.5
      ? [
          {
            id: "alert-5xx",
            severity: "critical" as const,
            title: "Elevated 5xx rate",
            detail: `API error rate at ${errorRate.toFixed(2)}% over the selected window.`,
            count: 1,
          },
        ]
      : []),
    ...(flagged > 0
      ? [
          {
            id: "alert-flags",
            severity: (flagged > 8 ? "critical" : "warning") as SystemAlert["severity"],
            title: "Flagged content waiting",
            detail: `${flagged} item${flagged === 1 ? "" : "s"} in the safety queue need review.`,
            count: flagged,
          },
        ]
      : []),
    {
      id: "alert-cwv",
      severity: cwvPass >= 90 ? "info" : "warning",
      title: cwvPass >= 90 ? "CWV within budget" : "CWV watch",
      detail:
        cwvPass >= 90
          ? `Core Web Vitals pass rate is ${cwvPass.toFixed(1)}%.`
          : `Pass rate dipped to ${cwvPass.toFixed(1)}% — check LCP on candidate dashboard.`,
    },
  ];

  return {
    range,
    generatedAt: new Date().toISOString(),
    metrics,
    alerts,
  };
}
