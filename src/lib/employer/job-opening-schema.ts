import { z } from "zod";

import { LOCATION_MODE_VALUES } from "@/lib/onboarding/form-schema";
import { OTHER_CITY_VALUE } from "@/lib/onboarding/locations";
import { TIMEZONE_VALUES, VISA_OPTIONS } from "@/lib/onboarding/schema";
import { SUPERPOWER_TAXONOMY } from "@/lib/reference/taxonomy";

const locationModeSchema = z.enum(LOCATION_MODE_VALUES);
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
  verifiedSkills: z
    .array(z.string().trim().min(1).max(60))
    .min(1, "Add at least one verified skill")
    .max(24, "Keep skills to 24 or fewer"),
  yearsExperience: z.number().int().min(0).max(40),
  suggestedTaglines: z
    .tuple([
      z.string().trim().min(8, "Tagline needs at least 8 characters").max(60),
      z.string().trim().min(8, "Tagline needs at least 8 characters").max(60),
      z.string().trim().min(8, "Tagline needs at least 8 characters").max(60),
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
  minSalary: z
    .number()
    .min(40_000, "Minimum salary must be at least $40,000")
    .max(400_000, "Minimum salary cannot exceed $400,000"),
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
    if (!data.globalCountry?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Country is required for hybrid/onsite roles",
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
        message: "Closest city is required for hybrid/onsite roles",
        path: ["globalCity"],
      });
    }
  }
}

export const jobOpeningFormSchema =
  jobOpeningFormObjectSchema.superRefine(refineJobOpening);

export type JobOpeningFormValues = z.infer<typeof jobOpeningFormObjectSchema>;

export const defaultJobOpeningValues: JobOpeningFormValues = {
  title: "",
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
  minSalary: 140000,
  visaStatuses: ["none"],
};

export function resolveJobOpeningCity(data: JobOpeningFormValues): string | null {
  if (!needsCommuteFields(data.locationModes)) return null;
  if (
    data.globalCountry === "Other" ||
    data.globalCity === OTHER_CITY_VALUE
  ) {
    return data.customCity?.trim() || null;
  }
  return data.globalCity?.trim() || null;
}

export type JobOpeningStatus = "draft" | "active" | "paused" | "closed";

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
