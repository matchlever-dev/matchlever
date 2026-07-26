import { z } from "zod";

import { OTHER_CITY_VALUE } from "@/lib/onboarding/locations";

export const ONBOARDING_STEPS = [
  { id: 1, key: "auth", title: "Identity", description: "Sign in privately" },
  { id: 2, key: "resume", title: "Resume", description: "Sanitize profile" },
  { id: 3, key: "preferences", title: "Preferences", description: "Work window" },
  { id: 4, key: "references", title: "References", description: "Verify trust" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

export const LOCATION_MODE_VALUES = ["remote", "hybrid", "onsite"] as const;
export type LocationModeValue = (typeof LOCATION_MODE_VALUES)[number];

const locationModeSchema = z.enum(LOCATION_MODE_VALUES);

function needsCommuteFields(modes: LocationModeValue[]) {
  return modes.includes("hybrid") || modes.includes("onsite");
}

export const onboardingFormObjectSchema = z.object({
  seekerTosAgreed: z.boolean(),
  linkedInConnected: z.boolean(),
  incognitoAgreed: z.boolean(),
  resumeFileName: z.string(),
  anonymousTitle: z.string().optional(),
  sanitizedSummary: z.string().optional(),
  verifiedSkills: z.array(z.string()),
  yearsExperience: z.number().int().nonnegative().optional(),
  suggestedTaglines: z.array(z.string()),
  locationModes: z
    .array(locationModeSchema)
    .min(1, "Select at least one location mode"),
  maxCommuteMiles: z.number().int().min(1).max(500).nullable(),
  openToRelocation: z.boolean().nullable(),
  globalCity: z.string().min(1, "Closest city is required"),
  globalCountry: z.string().min(1, "Country is required"),
  customCity: z.string().optional(),
  timezone: z.string().min(1, "Timezone is required"),
  workHoursStart: z.string().min(1, "Start time is required"),
  workHoursEnd: z.string().min(1, "End time is required"),
  minSalary: z.number().min(40_000).max(400_000),
  visaStatus: z.string().min(1, "Select a visa option"),
  selectedTagline: z.string().min(1, "Select a Superpower Tagline"),
  references: z
    .array(
      z.object({
        email: z.string().email("Enter a valid email address"),
        relationship: z.enum(["manager", "peer"]),
      })
    )
    .length(3),
});

function refinePreferences(
  data: {
    locationModes: LocationModeValue[];
    maxCommuteMiles: number | null;
    openToRelocation: boolean | null;
    globalCity: string;
    globalCountry: string;
    customCity?: string;
    suggestedTaglines: string[];
    selectedTagline: string;
  },
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
        message: "Say whether you are open to relocation",
        path: ["openToRelocation"],
      });
    }
  }

  if (data.globalCountry === "Other" || data.globalCity === OTHER_CITY_VALUE) {
    if (!data.customCity?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Enter your closest city",
        path: ["customCity"],
      });
    }
  }

  const trimmedTaglines = data.suggestedTaglines.map((t) => t.trim());
  if (trimmedTaglines.length !== 3 || trimmedTaglines.some((t) => t.length < 8)) {
    ctx.addIssue({
      code: "custom",
      message: "Each Superpower Tagline needs at least 8 characters",
      path: ["suggestedTaglines"],
    });
  }

  if (
    data.selectedTagline &&
    !trimmedTaglines.includes(data.selectedTagline.trim())
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Select one of your Superpower Taglines",
      path: ["selectedTagline"],
    });
  }
}

export const onboardingFormSchema = onboardingFormObjectSchema
  .superRefine((data, ctx) => {
    if (!data.seekerTosAgreed) {
      ctx.addIssue({
        code: "custom",
        message: "Agree to the Job Seeker Terms of Service to continue",
        path: ["seekerTosAgreed"],
      });
    }
    refinePreferences(data, ctx);
  });

export type OnboardingFormValues = z.infer<typeof onboardingFormObjectSchema>;

export const defaultOnboardingValues: OnboardingFormValues = {
  seekerTosAgreed: false,
  linkedInConnected: false,
  incognitoAgreed: false,
  resumeFileName: "",
  anonymousTitle: "",
  sanitizedSummary: "",
  verifiedSkills: [],
  yearsExperience: undefined,
  suggestedTaglines: [],
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
  visaStatus: "none",
  selectedTagline: "",
  references: [
    { email: "", relationship: "manager" },
    { email: "", relationship: "manager" },
    { email: "", relationship: "manager" },
  ],
};

export function resolveOnboardingCity(data: OnboardingFormValues): string {
  if (
    data.globalCountry === "Other" ||
    data.globalCity === OTHER_CITY_VALUE
  ) {
    return data.customCity?.trim() || "";
  }
  return data.globalCity.trim();
}

export function getStepSchema(step: OnboardingStepId) {
  switch (step) {
    case 1:
      return z
        .object({
          seekerTosAgreed: z.boolean(),
          linkedInConnected: z.boolean(),
          incognitoAgreed: z.boolean(),
        })
        .superRefine((data, ctx) => {
          if (!data.seekerTosAgreed) {
            ctx.addIssue({
              code: "custom",
              message: "Agree to the Job Seeker Terms of Service to continue",
              path: ["seekerTosAgreed"],
            });
          }
          if (!data.linkedInConnected) {
            ctx.addIssue({
              code: "custom",
              message: "Connect LinkedIn to continue",
              path: ["linkedInConnected"],
            });
          }
          if (!data.incognitoAgreed) {
            ctx.addIssue({
              code: "custom",
              message: "Agree to Incognito Privacy Mode to continue",
              path: ["incognitoAgreed"],
            });
          }
        });
    case 2:
      return z
        .object({
          resumeFileName: z.string(),
          suggestedTaglines: z.array(z.string()),
        })
        .superRefine((data, ctx) => {
          if (!data.resumeFileName) {
            ctx.addIssue({
              code: "custom",
              message: "Upload and sanitize a resume",
              path: ["resumeFileName"],
            });
          }
          if (data.suggestedTaglines.length !== 3) {
            ctx.addIssue({
              code: "custom",
              message: "Wait for AI extraction to finish",
              path: ["suggestedTaglines"],
            });
          }
        });
    case 3:
      return onboardingFormObjectSchema
        .pick({
          locationModes: true,
          maxCommuteMiles: true,
          openToRelocation: true,
          globalCity: true,
          globalCountry: true,
          customCity: true,
          timezone: true,
          workHoursStart: true,
          workHoursEnd: true,
          minSalary: true,
          visaStatus: true,
          suggestedTaglines: true,
          selectedTagline: true,
        })
        .superRefine((data, ctx) => refinePreferences(data, ctx));
    case 4:
      return onboardingFormObjectSchema.pick({
        references: true,
      });
  }
}
