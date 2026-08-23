import { z } from "zod";

import { normalizePublicLinkedInProfileUrl } from "@/lib/auth/linkedin-url";
import {
  analyzeLinkedInUrlStructure,
  type LinkedInStructureSignals,
} from "@/lib/reference/authenticity";
import { ensureAbsoluteHttpUrl } from "@/lib/url";

/** Shown when a referrer LinkedIn URL is missing, malformed, or does not open. */
export const REFERRER_LINKEDIN_INVALID_MESSAGE =
  "This LinkedIn page could not be opened. Use a full public profile URL (https://www.linkedin.com/in/...).";

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
  const parsed = new URL(ensureAbsoluteHttpUrl(url));
  const parts = parsed.pathname.split("/").filter(Boolean);
  const slug = decodeURIComponent(parts[1] ?? "")
    .replace(/\/+$/, "")
    .toLowerCase();
  return `linkedin.com/in/${slug}`;
}

export function normalizeLinkedInProfileUrl(url: string): string {
  const parsed = new URL(ensureAbsoluteHttpUrl(url));
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

function emptyChecks(exists: boolean | null): LinkedInChecks {
  return {
    exists,
    connections100: null,
    hasJob: null,
    hasPhoto: null,
    recentActivity: null,
  };
}

function htmlSaysProfileMissing(html: string): boolean {
  return /page not found|profile not found|this page doesn’t exist|this page doesn't exist|this profile is not available|the profile you are trying to view is not available/i.test(
    html
  );
}

function responseIsMissingProfile(finalUrl: string, html: string): boolean {
  if (htmlSaysProfileMissing(html)) return true;
  try {
    const parsed = new URL(finalUrl);
    if (!/(^|\.)linkedin\.com$/i.test(parsed.hostname)) return true;
    const path = parsed.pathname.toLowerCase();
    return path.includes("/404") || path.includes("/pub/dir");
  } catch {
    return true;
  }
}

function structuralProfileLooksReal(signals: LinkedInStructureSignals): boolean {
  return (
    signals.structuralScore >= 70 &&
    signals.slugLooksHuman &&
    Boolean(signals.slug) &&
    signals.slugLength >= 3 &&
    signals.slugLength <= 60
  );
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

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    flags.push(`public_status_${res.status}`);

    if (res.status === 404) {
      checks.exists = false;
      flags.push("public_404");
      return { checks, flags };
    }

    // LinkedIn WAF / rate-limit from datacenter IPs — not proof the profile is fake.
    if (res.status === 999 || res.status === 429) {
      flags.push(`public_blocked_${res.status}`);
      return { checks, flags };
    }

    if (res.status >= 400) {
      flags.push("public_http_error");
      return { checks, flags };
    }

    const html = await res.text();
    const finalUrl = res.url || linkedInUrl;

    if (responseIsMissingProfile(finalUrl, html)) {
      checks.exists = false;
      flags.push("public_not_found");
      return { checks, flags };
    }

    const lower = html.toLowerCase();
    checks.exists = true;
    flags.push("public_page_opened");

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

/**
 * Validate a referrer LinkedIn profile for talent intake / edits.
 * Rejects malformed URLs and definitive missing-profile responses.
 * LinkedIn often blocks datacenter fetches (999 / auth wall); those are
 * inconclusive, so a well-formed public /in/ URL is still accepted.
 */
export async function validateReferrerLinkedIn(
  rawUrl: string
): Promise<ReferrerLinkedInValidation> {
  const cleaned = normalizePublicLinkedInProfileUrl(rawUrl);
  if (!cleaned) {
    return {
      valid: false,
      normalizedUrl: typeof rawUrl === "string" ? rawUrl.trim() : "",
      mode: "structural",
      checks: emptyChecks(false),
      flags: ["invalid_url_format"],
    };
  }

  const normalizedUrl = normalizeLinkedInProfileUrl(cleaned);
  const signals = analyzeLinkedInUrlStructure(normalizedUrl);
  const flags: string[] = [
    `structural_score_${signals.structuralScore}`,
    signals.slugLooksHuman ? "slug_looks_human" : "slug_weak",
  ];

  try {
    const enriched = await fetchEnrichment(normalizedUrl);
    if (enriched) {
      flags.push("enrichment_provider");
      if (enriched.exists === true) {
        return {
          valid: true,
          normalizedUrl,
          mode: "enrichment",
          checks: enriched,
          flags,
        };
      }
      if (enriched.exists === false) {
        return {
          valid: false,
          normalizedUrl,
          mode: "enrichment",
          checks: enriched,
          flags,
        };
      }
      flags.push("enrichment_exists_unknown");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "enrichment_failed";
    flags.push(`enrichment_error:${message.slice(0, 80)}`);
  }

  const probe = await probePublicProfile(normalizedUrl);
  flags.push(...probe.flags);

  const checks: LinkedInChecks = {
    exists: probe.checks.exists ?? null,
    connections100: probe.checks.connections100 ?? null,
    hasJob: probe.checks.hasJob ?? null,
    hasPhoto: probe.checks.hasPhoto ?? null,
    recentActivity: probe.checks.recentActivity ?? null,
  };

  if (checks.exists === false) {
    return {
      valid: false,
      normalizedUrl,
      mode: "public_probe",
      checks,
      flags,
    };
  }

  if (checks.exists === true) {
    return {
      valid: true,
      normalizedUrl,
      mode: "public_probe",
      checks,
      flags,
    };
  }

  const looksReal = structuralProfileLooksReal(signals);
  flags.push(looksReal ? "structural_accept" : "structural_reject");
  return {
    valid: looksReal,
    normalizedUrl,
    mode: "structural",
    checks: {
      ...checks,
      exists: looksReal ? true : null,
    },
    flags,
  };
}
