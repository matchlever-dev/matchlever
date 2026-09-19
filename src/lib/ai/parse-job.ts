import Groq from "groq-sdk";

import {
  buildParseJobUserPrompt,
  PARSE_JOB_SYSTEM_PROMPT,
  parsedJobDescriptionSchema,
  type ParsedJobDescription,
} from "@/lib/employer/parse-job-schema";
import { getGroqClient, resolveGroqModel } from "@/lib/ai/groq";
import { SUPERPOWER_TAXONOMY } from "@/lib/reference/taxonomy";
import { TIMEZONE_VALUES, VISA_OPTIONS } from "@/lib/onboarding/schema";
import { LOCATION_MODE_VALUES } from "@/lib/onboarding/form-schema";
import { toPostgresStringArray, toPostgresText } from "@/lib/postgres-text";

const FALLBACK_MODEL = "qwen/qwen3.6-27b";
const ENDORSED_IDS = new Set(SUPERPOWER_TAXONOMY.map((skill) => skill.id));
const VISA_IDS = new Set(VISA_OPTIONS.map((option) => option.value));
const LOCATION_IDS = new Set<string>(LOCATION_MODE_VALUES);
const TIMEZONE_IDS = new Set(TIMEZONE_VALUES);

export async function parseJobDescriptionWithGroq(
  rawJobText: string
): Promise<ParsedJobDescription> {
  const groq = getGroqClient();
  let model = resolveGroqModel();

  let completion;
  try {
    completion = await createParseCompletion(groq, model, rawJobText);
  } catch (error) {
    if (isModelNotFound(error) && model !== FALLBACK_MODEL) {
      console.warn(
        `[groq job-parse] ${model} unavailable, retrying with ${FALLBACK_MODEL}`
      );
      model = FALLBACK_MODEL;
      completion = await createParseCompletion(groq, model, rawJobText);
    } else {
      throw error;
    }
  }

  const message = completion.choices[0]?.message as
    | { content?: string | null; reasoning?: string | null }
    | undefined;
  const content = messageText(message);
  if (!content) {
    throw new Error("Groq returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = parseJsonContent(content);
  } catch {
    throw new Error("Groq returned non-JSON content.");
  }

  const result = parsedJobDescriptionSchema.safeParse(normalizePayload(parsed));
  if (!result.success) {
    throw new Error(
      `Parsed job payload failed validation: ${result.error.issues
        .map((issue) => issue.message)
        .join("; ")}`
    );
  }

  return result.data;
}

function createParseCompletion(groq: Groq, model: string, rawJobText: string) {
  return groq.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: PARSE_JOB_SYSTEM_PROMPT },
      { role: "user", content: buildParseJobUserPrompt(rawJobText) },
    ],
  });
}

function isModelNotFound(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /model_not_found|does not exist or you do not have access/i.test(
    message
  );
}

function messageText(message: {
  content?: string | null;
  reasoning?: string | null;
} | undefined): string {
  if (!message) return "";
  if (typeof message.content === "string" && message.content.trim()) {
    return message.content;
  }
  if (typeof message.reasoning === "string" && message.reasoning.trim()) {
    return message.reasoning;
  }
  return "";
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const body = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
  return JSON.parse(body);
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const obj = value as Record<string, unknown>;

  const skills = Array.isArray(obj.verified_skills)
    ? toPostgresStringArray(obj.verified_skills.map(String)).slice(0, 24)
    : [];

  const taglinesRaw = Array.isArray(obj.suggested_taglines)
    ? obj.suggested_taglines.map((item) =>
        toPostgresText(String(item)).trim().slice(0, 60)
      )
    : [];
  while (taglinesRaw.length < 3) {
    taglinesRaw.push("Strong enterprise software delivery");
  }

  const endorsed = Array.isArray(obj.endorsed_skills)
    ? obj.endorsed_skills
        .map(String)
        .map((id) => normalizeEndorsedId(id))
        .filter((id): id is string => id != null && ENDORSED_IDS.has(id))
        .slice(0, 7)
    : [];

  const modes = Array.isArray(obj.location_modes)
    ? obj.location_modes
        .map(String)
        .map((mode) => mode.toLowerCase())
        .filter((mode) => LOCATION_IDS.has(mode))
    : ["remote"];

  let years: number | unknown = obj.years_experience;
  if (typeof years === "string" && years.trim() !== "") {
    years = Number.parseInt(years, 10);
  }

  let salaryRaw: unknown = obj.min_salary;
  if (typeof salaryRaw === "string" && salaryRaw.trim() !== "") {
    salaryRaw = Number.parseInt(salaryRaw.replace(/[$,\s]/g, ""), 10);
  }
  let salary = 140_000;
  if (typeof salaryRaw === "number" && Number.isFinite(salaryRaw)) {
    const normalized = salaryRaw < 1000 ? salaryRaw * 1000 : salaryRaw;
    salary = Math.min(400_000, Math.max(40_000, Math.round(normalized)));
  }

  const visas = Array.isArray(obj.visa_statuses)
    ? obj.visa_statuses
        .map(String)
        .filter((visa): visa is string => VISA_IDS.has(visa as never))
    : ["none"];

  const timezone =
    typeof obj.timezone === "string" && TIMEZONE_IDS.has(obj.timezone)
      ? obj.timezone
      : "America/New_York";

  const needsLocal = modes.includes("hybrid") || modes.includes("onsite");

  return {
    title:
      typeof obj.title === "string"
        ? toPostgresText(obj.title).trim().slice(0, 120)
        : "Software Engineer",
    verified_skills: skills.length > 0 ? skills : ["Software Engineering"],
    years_experience:
      typeof years === "number" && Number.isFinite(years)
        ? Math.min(40, Math.max(0, Math.trunc(years)))
        : 5,
    suggested_taglines: [
      taglinesRaw[0] || "Ships reliable enterprise software",
      taglinesRaw[1] || "Strong systems and delivery judgment",
      taglinesRaw[2] || "Collaborates across product and eng",
    ],
    endorsed_skills: endorsed,
    location_modes: modes.length > 0 ? modes : ["remote"],
    max_commute_miles: needsLocal
      ? coerceNullableInt(obj.max_commute_miles) ?? 30
      : null,
    open_to_relocation: needsLocal
      ? typeof obj.open_to_relocation === "boolean"
        ? obj.open_to_relocation
        : false
      : null,
    global_city: needsLocal
      ? typeof obj.global_city === "string" && obj.global_city.trim()
        ? toPostgresText(obj.global_city).trim()
        : null
      : null,
    global_country: needsLocal
      ? typeof obj.global_country === "string" && obj.global_country.trim()
        ? toPostgresText(obj.global_country).trim()
        : null
      : null,
    timezone,
    work_hours_start: normalizeClock(obj.work_hours_start) || "09:00",
    work_hours_end: normalizeClock(obj.work_hours_end) || "17:00",
    min_salary: salary,
    visa_statuses: visas.length > 0 ? visas : ["none"],
  };
}

function normalizeEndorsedId(raw: string): string | null {
  const trimmed = raw.trim();
  if (ENDORSED_IDS.has(trimmed)) return trimmed;
  const byLabel = SUPERPOWER_TAXONOMY.find(
    (skill) => skill.label.toLowerCase() === trimmed.toLowerCase()
  );
  return byLabel?.id ?? null;
}

function coerceNullableInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeClock(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number.parseInt(match[1]!, 10);
  const minutes = Number.parseInt(match[2]!, 10);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
