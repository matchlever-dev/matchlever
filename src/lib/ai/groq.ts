import Groq from "groq-sdk";

import {
  buildSanitizeUserPrompt,
  SANITIZE_SYSTEM_PROMPT,
  sanitizedResumeSchema,
  type SanitizedResume,
} from "@/lib/resume/sanitize-schema";

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

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
  const model = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;

  const completion = await groq.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SANITIZE_SYSTEM_PROMPT },
      { role: "user", content: buildSanitizeUserPrompt(rawResumeText) },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
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
