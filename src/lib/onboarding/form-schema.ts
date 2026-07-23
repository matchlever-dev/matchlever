import { z } from "zod";

export const ONBOARDING_STEPS = [
  { id: 1, key: "auth", title: "Identity", description: "Sign in privately" },
  { id: 2, key: "resume", title: "Resume", description: "Sanitize profile" },
  { id: 3, key: "preferences", title: "Preferences", description: "Work window" },
  { id: 4, key: "references", title: "References", description: "Verify trust" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

export const onboardingFormSchema = z.object({
  linkedInConnected: z.boolean(),
  incognitoAgreed: z.boolean(),
  resumeFileName: z.string(),
  anonymousTitle: z.string().optional(),
  sanitizedSummary: z.string().optional(),
  verifiedSkills: z.array(z.string()),
  yearsExperience: z.number().int().nonnegative().optional(),
  suggestedTaglines: z.array(z.string()),
  locationMode: z.enum(["remote", "hybrid", "onsite"]),
  globalCity: z.string().min(1, "City is required"),
  globalCountry: z.string().min(1, "Country is required"),
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

export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export const defaultOnboardingValues: OnboardingFormValues = {
  linkedInConnected: false,
  incognitoAgreed: false,
  resumeFileName: "",
  anonymousTitle: "",
  sanitizedSummary: "",
  verifiedSkills: [],
  yearsExperience: undefined,
  suggestedTaglines: [],
  locationMode: "remote",
  globalCity: "",
  globalCountry: "",
  timezone: "America/New_York",
  workHoursStart: "09:00",
  workHoursEnd: "17:00",
  minSalary: 140000,
  visaStatus: "none",
  selectedTagline: "",
  references: [
    { email: "", relationship: "manager" },
    { email: "", relationship: "manager" },
    { email: "", relationship: "peer" },
  ],
};

export function getStepSchema(step: OnboardingStepId) {
  switch (step) {
    case 1:
      return z
        .object({
          linkedInConnected: z.boolean(),
          incognitoAgreed: z.boolean(),
        })
        .superRefine((data, ctx) => {
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
      return onboardingFormSchema.pick({
        locationMode: true,
        globalCity: true,
        globalCountry: true,
        timezone: true,
        workHoursStart: true,
        workHoursEnd: true,
        minSalary: true,
        visaStatus: true,
        selectedTagline: true,
      });
    case 4:
      return onboardingFormSchema.pick({
        references: true,
      });
  }
}
