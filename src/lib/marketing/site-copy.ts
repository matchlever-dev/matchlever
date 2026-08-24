import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

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

function normalizeHeroTaglines(value: unknown): [string, string, string] {
  if (!Array.isArray(value) || value.length !== 3) {
    return [...DEFAULT_HERO_TAGLINES];
  }
  const lines = value.map((item) => String(item ?? "").trim());
  if (lines.some((line) => !line)) {
    return [...DEFAULT_HERO_TAGLINES];
  }
  return [lines[0]!, lines[1]!, lines[2]!];
}

/** Load marketing copy for public pages. Falls back to defaults. */
export async function getSiteCopy(): Promise<SiteCopy> {
  if (!isSupabaseConfigured()) {
    return DEFAULT_SITE_COPY;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_copy")
      .select("hero_taglines, brand_tagline")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error("[site copy]", error.message);
      }
      return DEFAULT_SITE_COPY;
    }

    const brandTagline = String(data.brand_tagline ?? "").trim();
    return {
      heroTaglines: normalizeHeroTaglines(data.hero_taglines),
      brandTagline: brandTagline || DEFAULT_BRAND_TAGLINE,
    };
  } catch (err) {
    console.error("[site copy]", err);
    return DEFAULT_SITE_COPY;
  }
}
