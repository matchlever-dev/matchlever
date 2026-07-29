export type SeekerAvailability = "actively_looking" | "on_hold";

/** Seekers must have this many verified references before appearing in searches. */
export const REQUIRED_VERIFIED_REFERENCES = 3;

export type SeekerReferenceRow = {
  id: string;
  reference_email: string;
  reference_linkedin_url: string | null;
  reference_name: string | null;
  relationship: string | null;
  status: string;
  verification_token: string;
};

export function countVerifiedReferences(
  references: Pick<SeekerReferenceRow, "status">[]
): number {
  return references.filter((r) => r.status === "verified").length;
}

export function hasCompleteReferences(
  references: Pick<SeekerReferenceRow, "status">[]
): boolean {
  return countVerifiedReferences(references) >= REQUIRED_VERIFIED_REFERENCES;
}

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

/** Display offset as UTC±H or UTC±H:MM (never raw minutes). */
export function formatTimezoneOffset(offsetMinutes: number | null): string {
  if (offsetMinutes === null || Number.isNaN(offsetMinutes)) return "Timezone TBD";
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return `UTC${sign}${hours}${mins ? `:${String(mins).padStart(2, "0")}` : ""}`;
}

/** Form value: signed hours from UTC, e.g. "-5" or "+5.5". */
export function offsetMinutesToHoursInput(
  offsetMinutes: number | null | undefined
): string {
  if (offsetMinutes === null || offsetMinutes === undefined) return "";
  if (Number.isNaN(offsetMinutes)) return "";
  const hours = offsetMinutes / 60;
  const rounded = Math.round(hours * 100) / 100;
  if (rounded === 0) return "0";
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

/** Parse hours-from-UTC input into minutes stored in the DB. */
export function offsetHoursInputToMinutes(input: string): number | null {
  const trimmed = input.trim().replace(/^utc/i, "");
  if (!trimmed) return null;
  const hours = Number.parseFloat(trimmed);
  if (!Number.isFinite(hours)) return null;
  const minutes = Math.round(hours * 60);
  if (minutes < -720 || minutes > 840) return null;
  return minutes;
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
  status: "on_hold",
  references: [
    {
      id: "ref-1",
      reference_email: "manager.one@example.com",
      reference_linkedin_url: "https://www.linkedin.com/in/jordan-lee",
      reference_name: "Jordan Lee",
      relationship: "manager",
      status: "verified",
      verification_token: "demo-token-ref-one-aaaa",
    },
    {
      id: "ref-2",
      reference_email: "peer.two@example.com",
      reference_linkedin_url: "https://www.linkedin.com/in/peer-two",
      reference_name: null,
      relationship: "peer",
      status: "verified",
      verification_token: "demo-token-ref-two-bbbb",
    },
    {
      id: "ref-3",
      reference_email: "director@example.com",
      reference_linkedin_url: "https://www.linkedin.com/in/director-example",
      reference_name: null,
      relationship: "skip_level",
      status: "pending",
      verification_token: "demo-token-ref-three-cccc",
    },
  ],
};
