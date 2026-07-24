import OpenAI from "openai";
import { z } from "zod";

export type LinkedInStructureSignals = {
  url: string;
  hostname: string;
  pathname: string;
  slug: string;
  slugLength: number;
  hasWww: boolean;
  usesHttps: boolean;
  slugLooksHuman: boolean;
  slugHasDigits: boolean;
  slugSegmentCount: number;
  estimatedAccountAgeYears: number | null;
  estimatedConnectionsBand: string;
  structuralScore: number;
};

const authenticityResultSchema = z.object({
  authenticity_score: z.number().min(0).max(100),
  authenticity_flags: z.array(z.string()),
  rationale: z.string().optional(),
});

export type AuthenticityResult = z.infer<typeof authenticityResultSchema>;

export function analyzeLinkedInUrlStructure(
  linkedInUrl: string
): LinkedInStructureSignals {
  const parsed = new URL(linkedInUrl);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const slug = decodeURIComponent(parts[1] ?? "").replace(/\/+$/, "");
  const slugLooksHuman = /^[a-z][a-z0-9-]{2,}$/i.test(slug) && !/^\d+$/.test(slug);
  const slugHasDigits = /\d/.test(slug);
  const slugSegmentCount = slug.split("-").filter(Boolean).length;

  // Lightweight heuristics — DeepSeek refines into the final score.
  let structuralScore = 40;
  if (parsed.protocol === "https:") structuralScore += 10;
  if (/(^|\.)linkedin\.com$/i.test(parsed.hostname)) structuralScore += 15;
  if (parts[0]?.toLowerCase() === "in" && slug) structuralScore += 15;
  if (slugLooksHuman) structuralScore += 10;
  if (slugSegmentCount >= 2 && slugSegmentCount <= 4) structuralScore += 5;
  if (slugHasDigits) structuralScore -= 5;
  if (slug.length < 3 || slug.length > 60) structuralScore -= 10;
  structuralScore = Math.max(0, Math.min(100, structuralScore));

  // Pseudo indicators for the model (not live LinkedIn scrapes).
  const estimatedAccountAgeYears =
    slugSegmentCount >= 2 ? Math.min(12, 3 + slugSegmentCount) : 2;
  const estimatedConnectionsBand =
    structuralScore >= 75
      ? "500+"
      : structuralScore >= 55
        ? "200-499"
        : "under-200";

  return {
    url: linkedInUrl,
    hostname: parsed.hostname,
    pathname: parsed.pathname,
    slug,
    slugLength: slug.length,
    hasWww: parsed.hostname.startsWith("www."),
    usesHttps: parsed.protocol === "https:",
    slugLooksHuman,
    slugHasDigits,
    slugSegmentCount,
    estimatedAccountAgeYears,
    estimatedConnectionsBand,
    structuralScore,
  };
}

function getDeepSeekClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey || apiKey.includes("your-")) {
    return null;
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });
}

/**
 * Scores LinkedIn authenticity via DeepSeek V3 using URL structure + heuristic signals.
 * Falls back to structural score when DeepSeek is not configured.
 */
export async function scoreLinkedInAuthenticity(
  linkedInUrl: string,
  context: { managerName: string; relationship: string }
): Promise<AuthenticityResult & { signals: LinkedInStructureSignals }> {
  const signals = analyzeLinkedInUrlStructure(linkedInUrl);
  const client = getDeepSeekClient();

  if (!client) {
    return {
      authenticity_score: signals.structuralScore,
      authenticity_flags: [
        "deepseek_unavailable",
        signals.slugLooksHuman ? "slug_looks_human" : "slug_weak",
        `connections_band:${signals.estimatedConnectionsBand}`,
      ],
      rationale: "Scored from LinkedIn URL structure heuristics only.",
      signals,
    };
  }

  const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are MatchLever's reference authenticity engine.
Analyze LinkedIn profile URL STRUCTURE and provided account-age / connection INDICATORS.
Do NOT invent private profile facts. Score authenticity from 0-100.
Return ONLY JSON:
{
  "authenticity_score": number,
  "authenticity_flags": string[],
  "rationale": string
}
Flag examples: valid_url_structure, human_slug, weak_slug, young_account_signal, strong_connection_band, suspicious_pattern.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          managerName: context.managerName,
          relationship: context.relationship,
          signals,
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek returned an empty authenticity response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("DeepSeek returned non-JSON authenticity content.");
  }

  const result = authenticityResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("DeepSeek authenticity payload failed validation.");
  }

  return { ...result.data, signals };
}
