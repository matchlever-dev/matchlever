/**
 * Postgres text/jsonb cannot store NUL. PostgREST encodes it as `\u0000`
 * and Postgres rejects the write with "unsupported Unicode escape sequence".
 * Lone UTF-16 surrogates are stripped for the same reason.
 */
const UNSAFE_UNICODE = /\u0000|[\uD800-\uDFFF]/g;

export function toPostgresText(value: string): string {
  return value.replace(UNSAFE_UNICODE, "");
}

export function toPostgresTextOrNull(
  value: string | null | undefined
): string | null {
  if (value == null) return null;
  const cleaned = toPostgresText(value).trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function toPostgresStringArray(values: string[]): string[] {
  return values.map((item) => toPostgresText(item).trim()).filter(Boolean);
}
