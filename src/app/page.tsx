import { CtaSplit } from "@/components/landing/cta-split";
import { FeaturedCarousel } from "@/components/landing/featured-carousel";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHero } from "@/components/landing/landing-hero";

export default function HomePage() {
  return (
    <main className="bg-[#F7F6F3] text-[#2A2D34]">
      <LandingHero />
      <FeaturedCarousel />
      <CtaSplit />
      <LandingFooter />
    </main>
  );
}
