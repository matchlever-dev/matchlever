import {
  formatTimezoneDisplay,
  initialsFromName,
} from "@/lib/dashboard/talent";
import type { Json } from "@/types/database";

export type IncognitoProfileInput = {
  headline: string | null;
  selectedTagline: string | null;
  sanitizedSummary: string | null;
  verifiedSkills: Json;
  yearsExperience: number | null;
  globalCity: string | null;
  globalCountry: string | null;
  timezone: string | null;
  timezoneOffset: number | null;
  locationModes: string[] | null;
  minSalary: number | null;
  visaStatus: string | null;
  workHoursStart: string | null;
  workHoursEnd: string | null;
  /** Display name only used for initials — never shown in the email. */
  fullName: string | null;
};

export type IncognitoProfile = {
  initials: string;
  headline: string;
  tagline: string;
  summary: string;
  verifiedSkills: string[];
  yearsExperience: number | null;
  locationLine: string;
  timezoneLabel: string;
  locationModes: string[];
  minSalary: number | null;
  visaStatus: string | null;
  workHours: string | null;
};

function asStringArray(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).map((s) => s.trim()).filter(Boolean);
}

function trimTime(value: string | null): string | null {
  if (!value) return null;
  return value.length >= 5 ? value.slice(0, 5) : value;
}

/** Build employer-facing incognito details (no real name, email, or LinkedIn). */
export function buildIncognitoProfile(
  input: IncognitoProfileInput
): IncognitoProfile {
  const skills = asStringArray(input.verifiedSkills);
  const modes = (input.locationModes ?? []).filter(Boolean);
  const city = input.globalCity?.trim() || null;
  const country = input.globalCountry?.trim() || null;
  const locationLine =
    city && country
      ? `${city}, ${country}`
      : city || country || "Location flexible";

  const start = trimTime(input.workHoursStart);
  const end = trimTime(input.workHoursEnd);
  const workHours = start && end ? `${start} – ${end}` : null;

  return {
    initials: initialsFromName(input.fullName || input.headline || "ML"),
    headline: input.headline?.trim() || "MatchLever talent",
    tagline:
      input.selectedTagline?.trim() ||
      "Verified enterprise software professional",
    summary:
      input.sanitizedSummary?.trim() ||
      "Detailed anonymous profile prepared from resume and MatchLever signals.",
    verifiedSkills: skills,
    yearsExperience: input.yearsExperience,
    locationLine,
    timezoneLabel: formatTimezoneDisplay(
      input.timezone,
      input.timezoneOffset
    ),
    locationModes: modes,
    minSalary: input.minSalary,
    visaStatus: input.visaStatus,
    workHours,
  };
}
