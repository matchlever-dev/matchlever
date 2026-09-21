import type { Metadata } from "next";

import { HowMatchLeverWorksSection } from "@/components/landing/employer-soft-launch";
import { FeaturedTalentSection } from "@/components/landing/featured-talent";
import { LandingHero } from "@/components/landing/landing-hero";
import { TwoPathCta } from "@/components/landing/two-path-cta";
import { getFeaturedTalent } from "@/lib/marketing/featured-talent.server";

export const metadata: Metadata = {
  title: "Match with Top-Tier Talent & Opportunities · MatchLever",
  description:
    "Match with top-tier talent and opportunities. Hire vetted professionals or apply as talent on MatchLever.",
};

export default async function HomePage() {
  const featuredTalent = await getFeaturedTalent();

  return (
    <main className="bg-[#F7F6F3] text-[#2A2D34]">
      <LandingHero />
      <TwoPathCta />
      <HowMatchLeverWorksSection />
      <FeaturedTalentSection talent={featuredTalent} />
    </main>
  );
}
