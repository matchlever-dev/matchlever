import { z } from "zod";

import { SUPERPOWER_TAXONOMY } from "@/lib/reference/taxonomy";

const superpowerIds = SUPERPOWER_TAXONOMY.map((s) => s.id) as [
  string,
  ...string[],
];

export const linkedInUrlSchema = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .refine(
    (value) =>
      /^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+\/?$/i.test(value),
    "Use a full LinkedIn profile URL (https://linkedin.com/in/...)"
  );

export const referenceVerifySchema = z.object({
  token: z.string().min(16, "Invalid verification token"),
  managerName: z.string().trim().min(2, "Enter the manager / peer name"),
  relationship: z.enum(["manager", "peer", "skip_level", "other"]),
  linkedInUrl: linkedInUrlSchema,
  superpowers: z
    .array(z.enum(superpowerIds))
    .length(7, "Select exactly 7 superpowers"),
  reliability: z.number().int().min(1).max(5),
  technicalQuality: z.number().int().min(1).max(5),
  rehireIntent: z.number().int().min(1).max(5),
  endorsement: z
    .string()
    .trim()
    .min(12, "Write one sentence endorsement")
    .max(280, "Keep endorsement to one sentence (max 280 chars)"),
});

export type ReferenceVerifyInput = z.infer<typeof referenceVerifySchema>;

export const referenceFormSchema = referenceVerifySchema.omit({ token: true });

export type ReferenceFormValues = z.infer<typeof referenceFormSchema>;

export const defaultReferenceFormValues: ReferenceFormValues = {
  managerName: "",
  relationship: "manager",
  linkedInUrl: "",
  superpowers: [],
  reliability: 4,
  technicalQuality: 4,
  rehireIntent: 4,
  endorsement: "",
};
