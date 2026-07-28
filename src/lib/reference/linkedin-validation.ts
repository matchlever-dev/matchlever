import { z } from "zod";

import {
  analyzeLinkedInUrlStructure,
  type LinkedInStructureSignals,
} from "@/lib/reference/authenticity";
import { linkedInUrlSchema } from "@/lib/reference/schema";

/** Opaque message shown to seekers — never reveal which check failed. */
export const REFERRER_LINKEDIN_INVALID_MESSAGE =
  "Referrer LinkedIn profile invalid";

export type LinkedInCheckKey =
  | "exists"
  | "connections100"
  | "hasJob"
  | "hasPhoto"
  | "recentActivity";

export type LinkedInChecks = Record<LinkedInCheckKey, boolean | null>;

export type ReferrerLinkedInValidation = {
  valid: boolean;
  normalizedUrl: string;
  mode: "enrichment" | "public_probe" | "structural";
  checks: LinkedInChecks;
  flags: string[];
};

function normalizeLinkedInPath(url: string): string {
  const parsed = new URL(url.trim());
  const parts = parsed.pathname.split("/").filter(Boolean);
  const slug = decodeURIComponent(parts[1] ?? "")
    .replace(/\/+$/, "")
    .toLowerCase();
  return `linkedin.com/in/${slug}`;
}

export function normalizeLinkedInProfileUrl(url: string): string {
  const parsed = new URL(url.trim());
  const parts = parsed.pathname.split("/").filter(Boolean);
  const slug = decodeURIComponent(parts[1] ?? "").replace(/\/+$/, "");
  return `https://www.linkedin.com/in/${slug}`;
}

export function linkedInUrlsMatch(a: string, b: string): boolean {
  try {
    return normalizeLinkedInPath(a) === normalizeLinkedInPath(b);
  } catch {
    return false;
  }
}

const enrichmentSchema = z.object({
  exists: z.boolean().optional(),
  connections: z.number().nullable().optional(),
  connectionCount: z.number().nullable().optional(),
  experiences: z.array(z.unknown()).optional(),
  experienceCount: z.number().nullable().optional(),
  hasPhoto: z.boolean().optional(),
  profilePicUrl: z.string().nullable().optional(),
  lastActivityAt: z.string().nullable().optional(),
  recentActivity: z.boolean().optional(),
});

function allRequiredPassed(checks: LinkedInChecks): boolean {
  return (
    checks.exists === true &&
    checks.connections100 === true &&
    checks.hasJob === true &&
    checks.hasPhoto === true &&
    checks.recentActivity === true
  );
}

function anyDefinitiveFail(checks: LinkedInChecks): boolean {
  return Object.values(checks).some((value) => value === false);
}

async function fetchEnrichment(
  linkedInUrl: string
): Promise<LinkedInChecks | null> {
  const endpoint = process.env.LINKEDIN_ENRICHMENT_URL?.trim();
  const apiKey = process.env.LINKEDIN_ENRICHMENT_API_KEY?.trim();
  if (!endpoint || !apiKey || apiKey.includes("your-")) return null;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ linkedinUrl: linkedInUrl }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    throw new Error(`Enrichment HTTP ${res.status}`);
  }

  const raw = enrichmentSchema.safeParse(await res.json());
  if (!raw.success) {
    throw new Error("Enrichment payload invalid");
  }

  const data = raw.data;
  const connections = data.connections ?? data.connectionCount ?? null;
  const experienceCount =
    data.experienceCount ??
    (Array.isArray(data.experiences) ? data.experiences.length : null);
  const hasPhoto =
    data.hasPhoto ??
    Boolean(data.profilePicUrl && !/ghost|default|placeholder/i.test(data.profilePicUrl));

  let recentActivity: boolean | null =
    typeof data.recentActivity === "boolean" ? data.recentActivity : null;
  if (recentActivity === null && data.lastActivityAt) {
    const ts = Date.parse(data.lastActivityAt);
    if (!Number.isNaN(ts)) {
      recentActivity = Date.now() - ts <= 365 * 24 * 60 * 60 * 1000;
    }
  }

  return {
    exists: data.exists ?? true,
    connections100: connections === null ? null : connections >= 100,
    hasJob: experienceCount === null ? null : experienceCount >= 1,
    hasPhoto: typeof hasPhoto === "boolean" ? hasPhoto : null,
    recentActivity,
  };
}

async function probePublicProfile(linkedInUrl: string): Promise<{
  checks: Partial<LinkedInChecks>;
  flags: string[];
}> {
  const flags: string[] = [];
  const checks: Partial<LinkedInChecks> = {};

  try {
    const res = await fetch(linkedInUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MatchLeverBot/1.0; +https://www.matchlever.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (res.status === 404) {
      checks.exists = false;
      flags.push("public_404");
      return { checks, flags };
    }

    // LinkedIn often returns auth walls (999 / 999-like) for bots — treat as
    // inconclusive existence rather than a definitive miss.
    if (res.status === 999 || res.status === 429) {
      flags.push(`public_status_${res.status}`);
      return { checks, flags };
    }

    const html = await res.text();
    const lower = html.toLowerCase();

    if (
      /page not found|profile not found|this page doesn’t exist|this page doesn't exist/i.test(
        html
      )
    ) {
      checks.exists = false;
      flags.push("public_not_found_copy");
      return { checks, flags };
    }

    const ogTitle = html.match(
      /property=["']og:title["']\s+content=["']([^"']+)["']/i
    )?.[1];
    const ogImage = html.match(
      /property=["']og:image["']\s+content=["']([^"']+)["']/i
    )?.[1];
    const ogDesc = html.match(
      /property=["']og:description["']\s+content=["']([^"']+)["']/i
    )?.[1];

    if (ogTitle || /linkedin\.com\/in\//i.test(html)) {
      checks.exists = true;
      flags.push("public_profile_signal");
    }

    if (ogImage) {
      const isDefault = /ghost|default|sprite|placeholder|data:image/i.test(
        ogImage
      );
      checks.hasPhoto = !isDefault;
      flags.push(checks.hasPhoto ? "public_photo" : "public_default_photo");
    }

    const connectionMatch =
      html.match(/([\d,]+)\s*\+?\s*connections/i) ||
      ogDesc?.match(/([\d,]+)\s*\+?\s*connections/i);
    if (connectionMatch?.[1]) {
      const n = Number(connectionMatch[1].replace(/,/g, ""));
      if (!Number.isNaN(n)) {
        checks.connections100 = n >= 100;
        flags.push(`public_connections_${n}`);
      }
    } else if (/500\+?\s*connections/i.test(html) || /500\+/.test(ogDesc ?? "")) {
      checks.connections100 = true;
      flags.push("public_connections_500_plus");
    }

    if (
      /experience|employed at|works at|former |current:|job title/i.test(lower) ||
      /experience/i.test(ogDesc ?? "")
    ) {
      checks.hasJob = true;
      flags.push("public_job_signal");
    }

    if (
      /liked|commented|posted|shared|activity|reacted/i.test(lower) &&
      /(202[4-6]|ago|month|week|day|hour)/i.test(lower)
    ) {
      checks.recentActivity = true;
      flags.push("public_activity_signal");
    }

    return { checks, flags };
  } catch (error) {
    const message = error instanceof Error ? error.message : "probe_failed";
    flags.push(`public_probe_error:${message.slice(0, 80)}`);
    return { checks, flags };
  }
}

function structuralGate(
  signals: LinkedInStructureSignals
): { checks: LinkedInChecks; flags: string[] } {
  const strongStructure =
    signals.structuralScore >= 70 &&
    signals.slugLooksHuman &&
    Boolean(signals.slug) &&
    signals.slugLength >= 3 &&
    signals.slugLength <= 60;

  // Without enrichment, LinkedIn rarely exposes connections / activity / jobs
  // to anonymous fetches. Use a strict structural gate as a substitute so we
  // still reject thin / fake-looking URLs without blocking real short slugs.
  return {
    checks: {
      exists: strongStructure,
      connections100: strongStructure,
      hasJob: strongStructure,
      hasPhoto: strongStructure,
      recentActivity: strongStructure,
    },
    flags: [
      "structural_substitute_gate",
      `structural_score_${signals.structuralScore}`,
      signals.slugLooksHuman ? "slug_looks_human" : "slug_weak",
    ],
  };
}

/**
 * Validate a referrer LinkedIn profile for seeker intake / edits.
 *
 * Preferred path: LINKEDIN_ENRICHMENT_URL + LINKEDIN_ENRICHMENT_API_KEY returning
 * connections, experiences, photo, and activity signals.
 *
 * Fallback: public HTML probe + structural substitute gates (LinkedIn blocks
 * most anonymous scrapes after Proxycurl-era enforcement).
 */
export async function validateReferrerLinkedIn(
  rawUrl: string
): Promise<ReferrerLinkedInValidation> {
  const parsedUrl = linkedInUrlSchema.safeParse(rawUrl);
  if (!parsedUrl.success) {
    return {
      valid: false,
      normalizedUrl: rawUrl.trim(),
      mode: "structural",
      checks: {
        exists: false,
        connections100: false,
        hasJob: false,
        hasPhoto: false,
        recentActivity: false,
      },
      flags: ["invalid_url_format"],
    };
  }

  const normalizedUrl = normalizeLinkedInProfileUrl(parsedUrl.data);
  const signals = analyzeLinkedInUrlStructure(normalizedUrl);
  const flags: string[] = [];

  // 1) Optional enrichment provider (full fidelity when configured)
  try {
    const enriched = await fetchEnrichment(normalizedUrl);
    if (enriched) {
      flags.push("enrichment_provider");
      const valid =
        allRequiredPassed(enriched) && !anyDefinitiveFail(enriched);
      return {
        valid,
        normalizedUrl,
        mode: "enrichment",
        checks: enriched,
        flags,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "enrichment_failed";
    flags.push(`enrichment_error:${message.slice(0, 80)}`);
  }

  // 2) Public probe (best-effort; often auth-walled)
  const probe = await probePublicProfile(normalizedUrl);
  flags.push(...probe.flags);

  const merged: LinkedInChecks = {
    exists: probe.checks.exists ?? null,
    connections100: probe.checks.connections100 ?? null,
    hasJob: probe.checks.hasJob ?? null,
    hasPhoto: probe.checks.hasPhoto ?? null,
    recentActivity: probe.checks.recentActivity ?? null,
  };

  if (anyDefinitiveFail(merged)) {
    return {
      valid: false,
      normalizedUrl,
      mode: "public_probe",
      checks: merged,
      flags,
    };
  }

  if (allRequiredPassed(merged)) {
    return {
      valid: true,
      normalizedUrl,
      mode: "public_probe",
      checks: merged,
      flags,
    };
  }

  // 3) Structural substitute for checks LinkedIn won't expose anonymously
  const gate = structuralGate(signals);
  flags.push(...gate.flags);

  const filled: LinkedInChecks = {
    exists: merged.exists ?? gate.checks.exists,
    connections100: merged.connections100 ?? gate.checks.connections100,
    hasJob: merged.hasJob ?? gate.checks.hasJob,
    hasPhoto: merged.hasPhoto ?? gate.checks.hasPhoto,
    recentActivity: merged.recentActivity ?? gate.checks.recentActivity,
  };

  return {
    valid: allRequiredPassed(filled),
    normalizedUrl,
    mode: "structural",
    checks: filled,
    flags,
  };
}
