/** Placeholder company values written before intake / LinkedIn company is known. */
const PLACEHOLDER_COMPANY_NAMES = new Set([
  "pending intake",
  "pending verification",
]);

export function isPlaceholderCompanyName(
  value: string | null | undefined
): boolean {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return true;
  return PLACEHOLDER_COMPANY_NAMES.has(trimmed.toLowerCase());
}

/** Real company name for display, or null when only a placeholder is stored. */
export function resolvedCompanyName(
  value: string | null | undefined
): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed || isPlaceholderCompanyName(trimmed)) return null;
  return trimmed;
}

/** LinkedIn / OAuth metadata company when present. */
export function companyNameFromAuthMetadata(user: {
  user_metadata?: Record<string, unknown> | null;
}): string | null {
  const metadata = user.user_metadata ?? {};
  for (const key of ["company", "organization", "org"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      const trimmed = value.trim();
      if (!isPlaceholderCompanyName(trimmed)) return trimmed;
    }
  }
  return null;
}
