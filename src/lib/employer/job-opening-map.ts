import {
  resolveJobOpeningCity,
  type JobOpeningFormValues,
} from "@/lib/employer/job-opening-schema";

export function jobOpeningPayloadToRow(
  data: JobOpeningFormValues,
  status: "draft" | "active"
) {
  const needsLocal =
    data.locationModes.includes("hybrid") ||
    data.locationModes.includes("onsite");
  const orderedModes = (["remote", "hybrid", "onsite"] as const).filter(
    (mode) => data.locationModes.includes(mode)
  );

  return {
    title: data.title.trim(),
    description: data.description?.trim() || null,
    status,
    verified_skills: data.verifiedSkills,
    years_experience: data.yearsExperience,
    suggested_taglines: data.suggestedTaglines.map((item) => item.trim()),
    endorsed_skills: data.endorsedSkills,
    location_modes: orderedModes,
    max_commute_miles: needsLocal ? data.maxCommuteMiles : null,
    open_to_relocation: needsLocal ? data.openToRelocation : null,
    global_city: resolveJobOpeningCity(data),
    global_country: needsLocal ? data.globalCountry || null : null,
    timezone: data.timezone,
    work_hours_start: normalizeTime(data.workHoursStart),
    work_hours_end: normalizeTime(data.workHoursEnd),
    min_salary: data.minSalary,
    visa_statuses: data.visaStatuses,
  };
}

export function jobRowToFormValues(row: {
  title: string;
  description?: string | null;
  verified_skills: unknown;
  years_experience: number | null;
  suggested_taglines: unknown;
  endorsed_skills: unknown;
  location_modes: string[] | null;
  max_commute_miles: number | null;
  open_to_relocation: boolean | null;
  global_city: string | null;
  global_country: string | null;
  timezone: string | null;
  work_hours_start: string | null;
  work_hours_end: string | null;
  min_salary: number | null;
  visa_statuses: string[] | null;
}): Partial<JobOpeningFormValues> {
  const taglines = Array.isArray(row.suggested_taglines)
    ? row.suggested_taglines.map(String)
    : ["", "", ""];
  while (taglines.length < 3) taglines.push("");

  const city = row.global_city ?? "";
  const country = row.global_country ?? "";

  return {
    title: row.title,
    description: row.description ?? "",
    verifiedSkills: Array.isArray(row.verified_skills)
      ? row.verified_skills.map(String)
      : [],
    yearsExperience: row.years_experience ?? 5,
    suggestedTaglines: [taglines[0] ?? "", taglines[1] ?? "", taglines[2] ?? ""],
    endorsedSkills: (Array.isArray(row.endorsed_skills)
      ? row.endorsed_skills.map(String)
      : []) as JobOpeningFormValues["endorsedSkills"],
    locationModes: (row.location_modes?.length
      ? row.location_modes
      : ["remote"]) as JobOpeningFormValues["locationModes"],
    maxCommuteMiles: row.max_commute_miles,
    openToRelocation: row.open_to_relocation,
    globalCountry: country,
    globalCity: city,
    customCity: city && country === "Other" ? city : "",
    timezone: (row.timezone ||
      "America/New_York") as JobOpeningFormValues["timezone"],
    workHoursStart: trimTime(row.work_hours_start) || "09:00",
    workHoursEnd: trimTime(row.work_hours_end) || "17:00",
    minSalary: row.min_salary ?? 140000,
    visaStatuses: (row.visa_statuses?.length
      ? row.visa_statuses
      : ["none"]) as JobOpeningFormValues["visaStatuses"],
  };
}

function normalizeTime(value: string): string {
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value;
}

function trimTime(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 5);
}

export function summarizeJobRow(row: {
  id: string;
  title: string;
  status: string;
  location_modes: string[] | null;
  global_city: string | null;
  min_salary: number | null;
  accepted_match_count: number | null;
  match_bundle_purchased_at: string | null;
  updated_at: string;
}) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    locationModes: row.location_modes ?? ["remote"],
    globalCity: row.global_city,
    minSalary: row.min_salary,
    acceptedMatchCount: row.accepted_match_count ?? 0,
    matchBundlePurchasedAt: row.match_bundle_purchased_at,
    updatedAt: row.updated_at,
  };
}
