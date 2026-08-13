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

export function candidateNameForInvite(
  user: AuthUserLike,
  storedName?: string | null
): string {
  return (
    stringOrNull(storedName) ||
    displayNameFromAuthUser(user) ||
    "a MatchLever candidate"
  );
}
