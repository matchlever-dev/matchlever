import { z } from "zod";

export const DEFAULT_HERO_TAGLINES = [
  "Upload your profile, find your match",
  "Where Tech Talent Meets Tech Innovators",
  "Your Lever into the Tech Industry",
] as const;

export const DEFAULT_BRAND_TAGLINE =
  "No names. No bias. Just the right match.";

export type SiteCopy = {
  heroTaglines: [string, string, string];
  brandTagline: string;
};

export const DEFAULT_SITE_COPY: SiteCopy = {
  heroTaglines: [...DEFAULT_HERO_TAGLINES],
  brandTagline: DEFAULT_BRAND_TAGLINE,
};

const taglineField = z.string().trim().min(1).max(120);

export const siteCopyUpdateSchema = z.object({
  heroTaglines: z.tuple([taglineField, taglineField, taglineField]),
  brandTagline: z.string().trim().min(1).max(200),
});

export type SiteCopyUpdate = z.infer<typeof siteCopyUpdateSchema>;

export function normalizeHeroTaglines(value: unknown): [string, string, string] {
  if (!Array.isArray(value) || value.length !== 3) {
    return [...DEFAULT_HERO_TAGLINES];
  }
  const lines = value.map((item) => String(item ?? "").trim());
  if (lines.some((line) => !line)) {
    return [...DEFAULT_HERO_TAGLINES];
  }
  return [lines[0]!, lines[1]!, lines[2]!];
}
