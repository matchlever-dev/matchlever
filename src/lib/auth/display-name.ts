type AuthUserLike = {
  email?: string | null;
  user_metadata?: {
    full_name?: unknown;
    name?: unknown;
    given_name?: unknown;
    family_name?: unknown;
  } | null;
};

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/** LinkedIn OIDC / Supabase metadata display name for the signed-in user. */
export function displayNameFromAuthUser(user: AuthUserLike): string | null {
  const metadata = user.user_metadata ?? {};
  const full = stringOrNull(metadata.full_name) || stringOrNull(metadata.name);
  if (full) return full;

  const given = stringOrNull(metadata.given_name);
  const family = stringOrNull(metadata.family_name);
  const combined = [given, family].filter(Boolean).join(" ").trim();
  return combined || null;
}

export function talentNameForInvite(
  user?: AuthUserLike | null,
  storedName?: string | null
): string {
  return (
    stringOrNull(storedName) ||
    (user ? displayNameFromAuthUser(user) : null) ||
    "a MatchLever talent"
  );
}

export function splitNameFromAuthUser(user: AuthUserLike): {
  firstName: string | null;
  lastName: string | null;
} {
  const metadata = user.user_metadata ?? {};
  const given = stringOrNull(metadata.given_name);
  const family = stringOrNull(metadata.family_name);
  if (given || family) {
    return { firstName: given, lastName: family };
  }
  const full =
    stringOrNull(metadata.full_name) || stringOrNull(metadata.name);
  if (!full) return { firstName: null, lastName: null };
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}
