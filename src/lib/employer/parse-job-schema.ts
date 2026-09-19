import { z } from "zod";

import { LOCATION_MODE_VALUES } from "@/lib/onboarding/form-schema";
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

/** Loose LLM output schema — normalized before applying to the job form. */
export const parsedJobDescriptionSchema = z.object({
  title: z.string().trim().min(2).max(120),
  verified_skills: z.array(z.string().trim().min(1).max(60)).min(1).max(24),
  years_experience: z.number().int().min(0).max(40),
  suggested_taglines: z.tuple([
    z.string().trim().min(8).max(60),
    z.string().trim().min(8).max(60),
    z.string().trim().min(8).max(60),
  ]),
  endorsed_skills: z.array(z.enum(endorsedSkillIds)).max(7),
  location_modes: z.array(locationModeSchema).min(1),
  max_commute_miles: z.number().int().min(1).max(500).nullable(),
  open_to_relocation: z.boolean().nullable(),
  global_city: z.string().trim().max(80).nullable(),
  global_country: z.string().trim().max(80).nullable(),
  timezone: z.enum(TIMEZONE_VALUES),
  work_hours_start: z.string().regex(/^\d{2}:\d{2}$/),
  work_hours_end: z.string().regex(/^\d{2}:\d{2}$/),
  min_salary: z.number().min(40_000).max(400_000),
  visa_statuses: z.array(z.enum(visaValues)).min(1),
});

export type ParsedJobDescription = z.infer<typeof parsedJobDescriptionSchema>;

const TAXONOMY_FOR_PROMPT = SUPERPOWER_TAXONOMY.map(
  (skill) => `${skill.id} = ${skill.label} (${skill.category})`
).join("\n");

const VISA_FOR_PROMPT = VISA_OPTIONS.map(
  (option) => `${option.value} = ${option.label}`
).join("\n");

const TIMEZONE_FOR_PROMPT = TIMEZONE_VALUES.join(", ");

export const PARSE_JOB_SYSTEM_PROMPT = `You are MatchLever's Job Description parser for an Enterprise Software Talent Exchange.

Extract structured hiring requirements from a raw job description. Prefer evidence in the text. When a field is missing, choose the most reasonable conservative default for enterprise software roles. Never invent fake company metrics.

## OUTPUT RULES
Return ONLY valid JSON (no markdown fences) matching:
{
  "title": string,
  "verified_skills": string[],
  "years_experience": integer,
  "suggested_taglines": [string, string, string],
  "endorsed_skills": string[],
  "location_modes": ("remote"|"hybrid"|"onsite")[],
  "max_commute_miles": integer|null,
  "open_to_relocation": boolean|null,
  "global_city": string|null,
  "global_country": string|null,
  "timezone": string,
  "work_hours_start": "HH:MM",
  "work_hours_end": "HH:MM",
  "min_salary": integer,
  "visa_statuses": string[]
}

## FIELD GUIDANCE
- title: best job title (no company name fluff).
- verified_skills: concrete skills/tools from the JD (canonical names). 4–16 items when possible.
- years_experience: minimum years required (0 if entry-level / not stated).
- suggested_taglines: exactly 3 punchy role-fit lines (max 60 chars each) employers can keep/edit.
- endorsed_skills: choose UP TO 7 ids from this taxonomy ONLY (use ids, not labels):
${TAXONOMY_FOR_PROMPT}
- location_modes: all modes clearly allowed. Default ["remote"] if unclear.
- If hybrid/onsite appear: set max_commute_miles (default 30 if unspecified), open_to_relocation (true if relocation offered/required, else false), global_city + global_country when mentioned. Otherwise set commute/relocation/city/country to null.
- timezone: must be one of: ${TIMEZONE_FOR_PROMPT}. Prefer America/New_York if unspecified US; UTC if fully global remote and unspecified.
- work hours: 24h HH:MM local. Default 09:00–17:00 if unspecified.
- min_salary: USD integer between 40000 and 400000. Use stated minimum / bottom of range. If only max given, use 70% of max bounded to range. If none, use 140000.
- visa_statuses: one or more of:
${VISA_FOR_PROMPT}
  Use ["none"] if sponsorship is not offered / not mentioned. Include sponsorship options when the JD says it sponsors or requires specific status.
`;

export function buildParseJobUserPrompt(rawJobText: string): string {
  return `Parse the following job description into the required JSON schema.

JOB DESCRIPTION TEXT:
---
${rawJobText.slice(0, 60_000)}
---`;
}
