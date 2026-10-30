/** Shared helpers for user-entered http(s) URLs (LinkedIn and otherwise). */

const HAS_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Make a pasted URL absolute. Accepts values with or without http:// or
 * https://. Defaults to https when the scheme is omitted.
 */
export function ensureAbsoluteHttpUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (HAS_SCHEME_RE.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

export function tryParseHttpUrl(value: string): URL | null {
  try {
    const parsed = new URL(ensureAbsoluteHttpUrl(value));
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Use on text inputs so browsers do not reject protocol-less URLs. */
export const urlTextInputProps = {
  type: "text" as const,
  inputMode: "url" as const,
  autoCapitalize: "none" as const,
  autoCorrect: "off" as const,
  spellCheck: false,
  autoComplete: "url" as const,
};
