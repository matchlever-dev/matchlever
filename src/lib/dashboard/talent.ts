import { resolveTimezoneOption } from "@/lib/onboarding/schema";

export type TalentAvailability = "actively_looking" | "on_hold";

/** Talent must have this many verified references before appearing in searches. */
export const REQUIRED_VERIFIED_REFERENCES = 3;

export type TalentReferenceRow = {
  id: string;
  reference_email: string;
  reference_linkedin_url: string | null;
  reference_name: string | null;
  relationship: string | null;
  status: string;
  verification_token: string;
};

export function countVerifiedReferences(
  references: Pick<TalentReferenceRow, "status">[]
): number {
  return references.filter((r) => r.status === "verified").length;
}

export function hasCompleteReferences(
  references: Pick<TalentReferenceRow, "status">[]
): boolean {
  return countVerifiedReferences(references) >= REQUIRED_VERIFIED_REFERENCES;
}

export type TalentDashboardData = {
  demo: boolean;
  profileId: string;
  initials: string;
  headline: string;
  selectedTagline: string;
  verifiedSkills: string[];
  globalCity: string;
  globalCountry: string;
  /** IANA timezone id when known (e.g. America/New_York). */
  timezone: string | null;
  timezoneOffset: number | null;
  /** Display label with zone name and UTC offset, e.g. "US Eastern (UTC−5)". */
  timezoneLabel: string;
  status: TalentAvailability;
  linkedinUrl: string | null;
  references: TalentReferenceRow[];
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

/** Named timezone + UTC offset for talent / employer / admin UIs. */
export function formatTimezoneDisplay(
  timezone: string | null | undefined,
  offsetMinutes?: number | null
): string {
  const option = resolveTimezoneOption(timezone, offsetMinutes);
  if (option) return option.label;
  if (offsetMinutes != null && !Number.isNaN(offsetMinutes)) {
    return formatTimezoneOffset(offsetMinutes);
  }
  return "Timezone TBD";
}

/** Resolve a stored timezone id, falling back from offset for legacy rows. */
export function resolveTimezoneId(
  timezone: string | null | undefined,
  offsetMinutes?: number | null
): string | null {
  return resolveTimezoneOption(timezone, offsetMinutes)?.value ?? null;
}

export function initialsFromName(name: string | null | undefined): string {
  if (!name?.trim()) return "ML";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export const DEMO_TALENT_DASHBOARD: TalentDashboardData = {
  demo: true,
  profileId: "demo-profile",
  initials: "SP",
  headline: "Staff Platform Engineer",
  selectedTagline: "Cut p99 latency 62% on a multi-region event bus",
  verifiedSkills: ["Go", "Kubernetes", "Kafka", "TypeScript"],
  globalCity: "Austin",
  globalCountry: "United States",
  timezone: "America/Chicago",
  timezoneOffset: -360,
  timezoneLabel: "US Central (UTC−6)",
  status: "on_hold",
  linkedinUrl: "https://www.linkedin.com/in/sam-patel",
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
