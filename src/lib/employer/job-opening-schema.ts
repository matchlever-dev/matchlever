import { z } from "zod";

import { LOCATION_MODE_VALUES } from "@/lib/onboarding/form-schema";
import { OTHER_CITY_VALUE } from "@/lib/onboarding/locations";
import { TIMEZONE_VALUES, VISA_OPTIONS } from "@/lib/onboarding/schema";
import { DEFAULT_ANNUAL_PAY, PAY_TYPE_VALUES } from "@/lib/pay";
import { SUPERPOWER_TAXONOMY } from "@/lib/reference/taxonomy";
import {
  SUPERPOWER_TAGLINE_MAX_LENGTH,
  SUPERPOWER_TAGLINE_MIN_LENGTH,
} from "@/lib/taglines";

const locationModeSchema = z.enum(LOCATION_MODE_VALUES);
const payTypeSchema = z.enum(PAY_TYPE_VALUES);
const visaValues = VISA_OPTIONS.map((option) => option.value) as [
  string,
  ...string[],
];
const endorsedSkillIds = SUPERPOWER_TAXONOMY.map((skill) => skill.id) as [
  string,
  ...string[],
];

function needsCommuteFields(modes: Array<(typeof LOCATION_MODE_VALUES)[number]>) {
  return modes.includes("hybrid") || modes.includes("onsite");
}

export const jobOpeningFormObjectSchema = z.object({
  title: z.string().trim().min(2, "Job title is required").max(120),
  description: z.string().trim().max(60_000).optional(),
  verifiedSkills: z
    .array(z.string().trim().min(1).max(60))
    .min(1, "Add at least one verified skill")
    .max(24, "Keep skills to 24 or fewer"),
  yearsExperience: z.number().int().min(0).max(40),
  suggestedTaglines: z
    .tuple([
      z
        .string()
        .trim()
        .min(
          SUPERPOWER_TAGLINE_MIN_LENGTH,
          "Tagline needs at least 8 characters"
        )
        .max(SUPERPOWER_TAGLINE_MAX_LENGTH),
      z
        .string()
        .trim()
        .min(
          SUPERPOWER_TAGLINE_MIN_LENGTH,
          "Tagline needs at least 8 characters"
        )
        .max(SUPERPOWER_TAGLINE_MAX_LENGTH),
      z
        .string()
        .trim()
        .min(
          SUPERPOWER_TAGLINE_MIN_LENGTH,
          "Tagline needs at least 8 characters"
        )
        .max(SUPERPOWER_TAGLINE_MAX_LENGTH),
    ]),
  endorsedSkills: z
    .array(z.enum(endorsedSkillIds))
    .max(7, "Select at most 7 endorsed skills"),
  locationModes: z
    .array(locationModeSchema)
    .min(1, "Select at least one location mode"),
  maxCommuteMiles: z.number().int().min(1).max(500).nullable(),
  openToRelocation: z.boolean().nullable(),
  globalCity: z.string().optional(),
  globalCountry: z.string().optional(),
  customCity: z.string().optional(),
  timezone: z.enum(TIMEZONE_VALUES, { error: "Timezone is required" }),
  workHoursStart: z.string().min(1, "Start time is required"),
  workHoursEnd: z.string().min(1, "End time is required"),
  payType: payTypeSchema,
  minSalary: z
    .number({ error: "Enter a pay amount" })
    .int("Use a whole-dollar amount")
    .positive("Pay must be greater than zero"),
  visaStatuses: z
    .array(z.enum(visaValues))
    .min(1, "Select at least one visa / work authorization option"),
});

function refineJobOpening(
  data: z.infer<typeof jobOpeningFormObjectSchema>,
  ctx: z.RefinementCtx
) {
  if (needsCommuteFields(data.locationModes)) {
    if (data.maxCommuteMiles == null) {
      ctx.addIssue({
        code: "custom",
        message: "Enter max commute in miles",
        path: ["maxCommuteMiles"],
      });
    }
    if (data.openToRelocation == null) {
      ctx.addIssue({
        code: "custom",
        message: "Say whether candidates must be open to relocation",
        path: ["openToRelocation"],
      });
    }
  }

  // Base location is always required so pay has geographic context.
  if (!data.globalCountry?.trim()) {
    ctx.addIssue({
      code: "custom",
      message: "Country is required",
      path: ["globalCountry"],
    });
  }
  if (
    data.globalCountry === "Other" ||
    data.globalCity === OTHER_CITY_VALUE
  ) {
    if (!data.customCity?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Enter the closest city",
        path: ["customCity"],
      });
    }
  } else if (!data.globalCity?.trim()) {
    ctx.addIssue({
      code: "custom",
      message: "Closest city is required",
      path: ["globalCity"],
    });
  }
}

export const jobOpeningFormSchema =
  jobOpeningFormObjectSchema.superRefine(refineJobOpening);

export type JobOpeningFormValues = z.infer<typeof jobOpeningFormObjectSchema>;

export const defaultJobOpeningValues: JobOpeningFormValues = {
  title: "",
  description: "",
  verifiedSkills: [],
  yearsExperience: 5,
  suggestedTaglines: ["", "", ""],
  endorsedSkills: [],
  locationModes: ["remote"],
  maxCommuteMiles: null,
  openToRelocation: null,
  globalCity: "",
  globalCountry: "",
  customCity: "",
  timezone: "America/New_York",
  workHoursStart: "09:00",
  workHoursEnd: "17:00",
  payType: "annual",
  minSalary: DEFAULT_ANNUAL_PAY,
  visaStatuses: ["none"],
};

export function resolveJobOpeningCity(data: JobOpeningFormValues): string | null {
  if (
    data.globalCountry === "Other" ||
    data.globalCity === OTHER_CITY_VALUE
  ) {
    return data.customCity?.trim() || null;
  }
  return data.globalCity?.trim() || null;
}

export const JOB_OPENING_STATUSES = [
  "draft",
  "active",
  "paused",
  "closed",
  "hired",
] as const;

export type JobOpeningStatus = (typeof JOB_OPENING_STATUSES)[number];

/** Statuses that still accept new matches. */
export const MATCHABLE_JOB_STATUSES: JobOpeningStatus[] = ["active", "paused"];

export function isMatchableJobStatus(
  status: string | null | undefined
): boolean {
  return status === "active" || status === "paused";
}

export function jobOpeningStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "closed":
      return "Closed";
    case "hired":
      return "Hired";
    default:
      return status;
  }
}

export function formatJobLocationLine(job: {
  locationModes: string[];
  globalCity: string | null;
}): string {
  const modes = job.locationModes
    .map((mode) => mode.charAt(0).toUpperCase() + mode.slice(1))
    .join(" / ");
  if (job.globalCity) return `${modes} • ${job.globalCity}`;
  return modes || "Remote";
}
