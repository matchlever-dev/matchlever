export type SeekerAvailability = "actively_looking" | "on_hold";

export type SeekerReferenceRow = {
  id: string;
  reference_email: string;
  reference_name: string | null;
  relationship: string | null;
  status: string;
  verification_token: string;
};

export type SeekerDashboardData = {
  demo: boolean;
  profileId: string;
  initials: string;
  headline: string;
  selectedTagline: string;
  verifiedSkills: string[];
  globalCity: string;
  globalCountry: string;
  timezoneOffset: number | null;
  timezoneLabel: string;
  status: SeekerAvailability;
  references: SeekerReferenceRow[];
};

export function formatTimezoneOffset(offsetMinutes: number | null): string {
  if (offsetMinutes === null || Number.isNaN(offsetMinutes)) return "Timezone TBD";
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return `UTC${sign}${hours}${mins ? `:${String(mins).padStart(2, "0")}` : ""}`;
}

export function initialsFromName(name: string | null | undefined): string {
  if (!name?.trim()) return "ML";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export const DEMO_SEEKER_DASHBOARD: SeekerDashboardData = {
  demo: true,
  profileId: "demo-profile",
  initials: "SP",
  headline: "Staff Platform Engineer",
  selectedTagline: "Cut p99 latency 62% on a multi-region event bus",
  verifiedSkills: ["Go", "Kubernetes", "Kafka", "TypeScript"],
  globalCity: "Austin",
  globalCountry: "United States",
  timezoneOffset: -300,
  timezoneLabel: "UTC-5",
  status: "actively_looking",
  references: [
    {
      id: "ref-1",
      reference_email: "manager.one@example.com",
      reference_name: "Jordan Lee",
      relationship: "manager",
      status: "verified",
      verification_token: "demo-token-ref-one-aaaa",
    },
    {
      id: "ref-2",
      reference_email: "peer.two@example.com",
      reference_name: null,
      relationship: "peer",
      status: "verified",
      verification_token: "demo-token-ref-two-bbbb",
    },
    {
      id: "ref-3",
      reference_email: "director@example.com",
      reference_name: null,
      relationship: "skip_level",
      status: "pending",
      verification_token: "demo-token-ref-three-cccc",
    },
  ],
};
