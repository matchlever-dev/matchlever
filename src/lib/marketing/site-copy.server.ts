import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  DEFAULT_BRAND_TAGLINE,
  DEFAULT_SITE_COPY,
  normalizeHeroTaglines,
  type SiteCopy,
} from "@/lib/marketing/site-copy";

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
