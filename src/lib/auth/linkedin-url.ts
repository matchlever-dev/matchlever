type AuthIdentityLike = {
  provider?: string;
  identity_data?: Record<string, unknown> | null;
};

export type AuthUserLike = {
  id?: string;
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
    const host = url.hostname.toLowerCase();
    const isLinkedIn = /(^|\.)linkedin\.com$/i.test(host);
    const isShort = host === "lnkd.in" || host.endsWith(".lnkd.in");
    if (!isLinkedIn && !isShort) return null;
    if (isLinkedIn && !/^\/in\//i.test(url.pathname) && !/^\/pub\//i.test(url.pathname)) {
      return null;
    }
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
  if (!/^[A-Za-z][A-Za-z0-9\-_%]{1,99}$/.test(slug)) return null;
  return `https://www.linkedin.com/in/${slug}`;
}

function walkForLinkedInUrl(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null) return null;
  const direct = asLinkedInProfileUrl(value);
  if (direct) return direct;
  if (typeof value === "string") {
    return linkedinUrlFromText(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = walkForLinkedInUrl(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredKeys = [
      "linkedin_url",
      "linkedinUrl",
      "vanityName",
      "vanity_name",
      "publicIdentifier",
      "public_identifier",
      "profileUrl",
      "profile_url",
      "html_url",
      "url",
      "profile",
      "preferred_username",
    ];
    for (const key of preferredKeys) {
      if (!(key in record)) continue;
      const found =
        asLinkedInProfileUrl(record[key]) ||
        slugToLinkedInUrl(record[key]) ||
        walkForLinkedInUrl(record[key], depth + 1);
      if (found) return found;
    }
    for (const nested of Object.values(record)) {
      const found = walkForLinkedInUrl(nested, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** Public LinkedIn profile URL from LinkedIn OIDC metadata / identities. */
export function linkedinUrlFromAuthUser(user: AuthUserLike): string | null {
  const fromMetadata = walkForLinkedInUrl(user.user_metadata ?? null);
  if (fromMetadata) return fromMetadata;

  for (const identity of user.identities ?? []) {
    if (
      identity.provider &&
      !identity.provider.toLowerCase().includes("linkedin")
    ) {
      continue;
    }
    const fromIdentity = walkForLinkedInUrl(identity.identity_data ?? null);
    if (fromIdentity) return fromIdentity;
  }

  return null;
}

const RESUME_LINKEDIN_RE =
  /(?:https?:\/\/)?(?:(?:[\w-]+\.)?linkedin\.com\/(?:in|pub)\/[A-Za-z0-9\-_%/]+|lnkd\.in\/[A-Za-z0-9\-_]+)/gi;

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

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * LinkedIn OIDC userinfo has no vanity URL. If the access token also authorizes
 * Profile API fields, vanityName / publicIdentifier can be turned into /in/{slug}.
 */
export async function fetchLinkedInProfileUrlFromAccessToken(
  accessToken: string | null | undefined
): Promise<string | null> {
  const token = accessToken?.trim();
  if (!token) return null;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  const endpoints = [
    "https://api.linkedin.com/v2/userinfo",
    "https://api.linkedin.com/v2/me?projection=(id,vanityName,localizedFirstName,localizedLastName,publicIdentifier)",
    "https://api.linkedin.com/rest/me",
  ];

  const results = await Promise.allSettled(
    endpoints.map(async (url) => {
      const res = await fetch(url, {
        headers: {
          ...headers,
          ...(url.includes("/rest/")
            ? {
                "Linkedin-Version": "202504",
                "X-Restli-Protocol-Version": "2.0.0",
              }
            : { "X-RestLi-Protocol-Version": "2.0.0" }),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) return null;
      return walkForLinkedInUrl(await readJson(res));
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) return result.value;
  }
  return null;
}

export async function captureCandidateLinkedInUrl(input: {
  stored?: string | null;
  authUser?: AuthUserLike | null;
  resumeText?: string | null;
  accessToken?: string | null;
}): Promise<string | null> {
  const local = resolveCandidateLinkedInUrl(input);
  if (local) return local;
  return fetchLinkedInProfileUrlFromAccessToken(input.accessToken);
}
