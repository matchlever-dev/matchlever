type AuthIdentityLike = {
  provider?: string;
  identity_data?: Record<string, unknown> | null;
};

type AuthUserLike = {
  user_metadata?: Record<string, unknown> | null;
  identities?: AuthIdentityLike[] | null;
};

function asLinkedInProfileUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    );
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) return null;
    url.protocol = "https:";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function slugToLinkedInUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().replace(/^\/+|\/+$/g, "");
  if (!slug || slug.includes("@") || slug.includes("/") || slug.includes(".")) {
    return null;
  }
  if (!/^[A-Za-z0-9\-_%]+$/.test(slug)) return null;
  return `https://www.linkedin.com/in/${slug}`;
}

function linkedinUrlFromRecord(
  record: Record<string, unknown> | null | undefined
): string | null {
  if (!record) return null;

  const direct = [
    record.linkedin_url,
    record.linkedinUrl,
    record.profile,
    record.profileUrl,
    record.html_url,
    record.url,
  ]
    .map(asLinkedInProfileUrl)
    .find(Boolean);
  if (direct) return direct;

  const customClaims = record.custom_claims;
  if (customClaims && typeof customClaims === "object") {
    const nested = linkedinUrlFromRecord(
      customClaims as Record<string, unknown>
    );
    if (nested) return nested;
  }

  return (
    slugToLinkedInUrl(record.preferred_username) ||
    slugToLinkedInUrl(record.vanityName) ||
    slugToLinkedInUrl(record.vanity_name)
  );
}

/** Public LinkedIn profile URL from LinkedIn OIDC metadata / identities. */
export function linkedinUrlFromAuthUser(user: AuthUserLike): string | null {
  const fromMetadata = linkedinUrlFromRecord(user.user_metadata ?? null);
  if (fromMetadata) return fromMetadata;

  for (const identity of user.identities ?? []) {
    if (
      identity.provider &&
      !identity.provider.toLowerCase().includes("linkedin")
    ) {
      continue;
    }
    const fromIdentity = linkedinUrlFromRecord(identity.identity_data ?? null);
    if (fromIdentity) return fromIdentity;
  }

  return null;
}

const RESUME_LINKEDIN_RE =
  /(?:https?:\/\/)?(?:[\w-]+\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+/gi;

/** First public /in/ profile URL found in resume or other free text. */
export function linkedinUrlFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  const matches = text.match(RESUME_LINKEDIN_RE);
  if (!matches) return null;
  for (const match of matches) {
    const url = asLinkedInProfileUrl(match);
    if (url) return url;
  }
  return null;
}

export function resolveCandidateLinkedInUrl(input: {
  stored?: string | null;
  authUser?: AuthUserLike | null;
  resumeText?: string | null;
}): string | null {
  return (
    asLinkedInProfileUrl(input.stored) ||
    (input.authUser ? linkedinUrlFromAuthUser(input.authUser) : null) ||
    linkedinUrlFromText(input.resumeText)
  );
}
