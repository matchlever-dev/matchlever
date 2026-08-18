import Groq from "groq-sdk";

import {
  buildSanitizeUserPrompt,
  SANITIZE_SYSTEM_PROMPT,
  sanitizedResumeSchema,
  type SanitizedResume,
} from "@/lib/resume/sanitize-schema";

/** Groq retired llama-3.3-70b-versatile on 2026-08-16. */
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const FALLBACK_MODEL = "qwen/qwen3.6-27b";

const DEPRECATED_GROQ_MODELS: Record<string, string> = {
  "llama-3.3-70b-versatile": DEFAULT_MODEL,
  "llama-3.1-8b-instant": "openai/gpt-oss-20b",
  "llama3-70b-8192": DEFAULT_MODEL,
  "llama3-8b-8192": "openai/gpt-oss-20b",
};

export function resolveGroqModel(): string {
  const requested = process.env.GROQ_MODEL?.trim();
  if (!requested) return DEFAULT_MODEL;
  return DEPRECATED_GROQ_MODELS[requested] ?? requested;
}

export function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey || apiKey.includes("your-") || apiKey.length < 20) {
    throw new Error(
      "Missing GROQ_API_KEY. Add it to .env.local (https://console.groq.com/keys)."
    );
  }
  return new Groq({ apiKey });
}

export async function sanitizeResumeWithGroq(
  rawResumeText: string
): Promise<SanitizedResume> {
  const groq = getGroqClient();
  let model = resolveGroqModel();

  let completion;
  try {
    completion = await createSanitizeCompletion(groq, model, rawResumeText);
  } catch (error) {
    if (isModelNotFound(error) && model !== FALLBACK_MODEL) {
      console.warn(
        `[groq] ${model} unavailable, retrying with ${FALLBACK_MODEL}`
      );
      model = FALLBACK_MODEL;
      completion = await createSanitizeCompletion(groq, model, rawResumeText);
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

  const result = sanitizedResumeSchema.safeParse(normalizePayload(parsed));
  if (!result.success) {
    throw new Error(
      `Sanitized payload failed validation: ${result.error.issues
        .map((i) => i.message)
        .join("; ")}`
    );
  }

  return result.data;
}

function createSanitizeCompletion(
  groq: Groq,
  model: string,
  rawResumeText: string
) {
  return groq.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SANITIZE_SYSTEM_PROMPT },
      { role: "user", content: buildSanitizeUserPrompt(rawResumeText) },
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
  const candidate = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
  return JSON.parse(candidate);
}

/** Coerce common LLM quirks before Zod validation. */
function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const obj = value as Record<string, unknown>;

  const skills = obj.verified_skills;
  const taglines = obj.suggested_taglines;
  let years = obj.years_experience;

  if (typeof years === "string" && years.trim() !== "") {
    years = Number.parseInt(years, 10);
  }

  return {
    ...obj,
    years_experience: years,
    verified_skills: Array.isArray(skills)
      ? skills.map(String).map((s) => s.trim()).filter(Boolean)
      : skills,
    suggested_taglines: Array.isArray(taglines)
      ? taglines.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 3)
      : taglines,
  };
}
