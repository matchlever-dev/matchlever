import { CtaSplit } from "@/components/landing/cta-split";
import { FeaturedCarousel } from "@/components/landing/featured-carousel";
import { LandingHero } from "@/components/landing/landing-hero";

export default function HomePage() {
  return (
    <main className="bg-brand-canvas text-brand-charcoal">
      <LandingHero />
      <FeaturedCarousel />
      <CtaSplit />
    </main>
  );
}
