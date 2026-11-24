/** Shared limits for MatchLever "Superpower Taglines" (talent + employer). */
export const SUPERPOWER_TAGLINE_MIN_LENGTH = 8;
export const SUPERPOWER_TAGLINE_MAX_LENGTH = 80;

export function clampSuperpowerTagline(value: string): string {
  return value.trim().slice(0, SUPERPOWER_TAGLINE_MAX_LENGTH);
}
