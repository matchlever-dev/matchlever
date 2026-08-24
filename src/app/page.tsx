import { CtaSplit } from "@/components/landing/cta-split";
import { EmployerSoftLaunchSection } from "@/components/landing/employer-soft-launch";
import { FeaturedCarousel } from "@/components/landing/featured-carousel";
import { LandingHero } from "@/components/landing/landing-hero";
import { getSiteCopy } from "@/lib/marketing/site-copy.server";

export default async function HomePage() {
  const { heroTaglines } = await getSiteCopy();

  return (
    <main className="bg-[#F7F6F3] text-[#2A2D34]">
      <LandingHero heroTaglines={heroTaglines} />
      <EmployerSoftLaunchSection />
      <FeaturedCarousel />
      <CtaSplit />
    </main>
  );
}
