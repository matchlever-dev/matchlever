import type { Metadata } from "next";

import { StreamlineHiringSection } from "@/components/landing/employer-soft-launch";

export const metadata: Metadata = {
  title: "Why MatchLever · Arise Solutions",
  description:
    "Why MatchLever? Talent gets precise matches without the black hole. Employers get pre-validated candidates without the firehose.",
};

export default function WhyMatchLeverPage() {
  return (
    <main className="bg-[#F7F6F3] text-[#2A2D34]">
      <StreamlineHiringSection />
    </main>
  );
}
