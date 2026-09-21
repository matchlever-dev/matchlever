import "server-only";

import {
  FEATURED_TALENT,
  type FeaturedTalent,
} from "@/lib/onboarding/featured-talent";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const FEATURED_COUNT = 3;
const PROFILE_HREF = "/employer/waitlist";

type SuperpowerVote = {
  label?: unknown;
  votes?: unknown;
};

function formatSuperPower(
  verifiedSuperpowers: unknown,
  verifiedSkills: unknown,
): string {
  if (Array.isArray(verifiedSuperpowers) && verifiedSuperpowers.length > 0) {
    const labels = verifiedSuperpowers
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as SuperpowerVote;
        const label = String(row.label ?? "").trim();
        return label || null;
      })
      .filter((label): label is string => Boolean(label))
      .slice(0, 3);

    if (labels.length > 0) {
      return formatPowerLine(labels);
    }
  }

  if (Array.isArray(verifiedSkills) && verifiedSkills.length > 0) {
    const skills = verifiedSkills
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .slice(0, 3);
    if (skills.length > 0) {
      return formatPowerLine(skills);
    }
  }

  return "⚡ Verified enterprise software talent";
}

function formatPowerLine(parts: string[]): string {
  if (parts.length === 1) return `⚡ ${parts[0]}`;
  if (parts.length === 2) return `⚡ ${parts[0]} & ${parts[1]}`;
  return `⚡ ${parts[0]}, ${parts[1]}, & ${parts[2]}`;
}

function averageReferenceScore(
  refs: {
    reliability_score: number | null;
    technical_quality_score: number | null;
    rehire_intent_score: number | null;
  }[],
): number {
  if (refs.length === 0) return 0;
  let total = 0;
  let count = 0;
  for (const ref of refs) {
    const scores = [
      ref.reliability_score,
      ref.technical_quality_score,
      ref.rehire_intent_score,
    ].filter((n): n is number => typeof n === "number");
    if (scores.length === 0) continue;
    total += scores.reduce((sum, n) => sum + n, 0) / scores.length;
    count += 1;
  }
  return count === 0 ? 0 : total / count;
}

/**
 * Top actively looking talent for the homepage grid (anonymous only).
 * Falls back to curated marketing cards when the pool is empty.
 */
export async function getFeaturedTalent(): Promise<FeaturedTalent[]> {
  if (!isSupabaseConfigured()) {
    return FEATURED_TALENT.slice(0, FEATURED_COUNT);
  }

  const admin = createAdminClient();
  if (!admin) {
    return FEATURED_TALENT.slice(0, FEATURED_COUNT);
  }

  try {
    const { data: profiles, error } = await admin
      .from("talent_profiles")
      .select(
        "id, headline, selected_tagline, verified_skills, verified_superpowers, status",
      )
      .eq("status", "actively_looking")
      .not("headline", "is", null)
      .limit(24);

    if (error || !profiles?.length) {
      if (error) console.error("[featured talent]", error.message);
      return FEATURED_TALENT.slice(0, FEATURED_COUNT);
    }

    const profileIds = profiles.map((p) => p.id);

    const { data: references } = await admin
      .from("talent_references")
      .select(
        "talent_profile_id, status, reliability_score, technical_quality_score, rehire_intent_score",
      )
      .in("talent_profile_id", profileIds)
      .eq("status", "verified");

    const refsByTalent = new Map<
      string,
      {
        reliability_score: number | null;
        technical_quality_score: number | null;
        rehire_intent_score: number | null;
      }[]
    >();
    for (const ref of references ?? []) {
      const list = refsByTalent.get(ref.talent_profile_id) ?? [];
      list.push(ref);
      refsByTalent.set(ref.talent_profile_id, list);
    }

    const ranked = profiles
      .map((profile) => {
        const refs = refsByTalent.get(profile.id) ?? [];
        return {
          profile,
          score: averageReferenceScore(refs),
          refCount: refs.length,
        };
      })
      .filter((row) => row.refCount > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.refCount - a.refCount ||
          String(a.profile.headline).localeCompare(String(b.profile.headline)),
      )
      .slice(0, FEATURED_COUNT);

    if (ranked.length === 0) {
      return FEATURED_TALENT.slice(0, FEATURED_COUNT);
    }

    const live: FeaturedTalent[] = ranked.map(({ profile }) => {
      const tagline =
        String(profile.selected_tagline ?? "").trim() ||
        "Verified MatchLever talent ready to deliver.";

      return {
        id: profile.id,
        title: String(profile.headline ?? "Software Engineer").trim(),
        tagline,
        superPower: formatSuperPower(
          profile.verified_superpowers,
          profile.verified_skills,
        ),
        profileHref: PROFILE_HREF,
      };
    });

    if (live.length >= FEATURED_COUNT) return live;

    const usedTitles = new Set(live.map((t) => t.title.toLowerCase()));
    const fillers = FEATURED_TALENT.filter(
      (t) => !usedTitles.has(t.title.toLowerCase()),
    ).slice(0, FEATURED_COUNT - live.length);

    return [...live, ...fillers];
  } catch (err) {
    console.error("[featured talent]", err);
    return FEATURED_TALENT.slice(0, FEATURED_COUNT);
  }
}
