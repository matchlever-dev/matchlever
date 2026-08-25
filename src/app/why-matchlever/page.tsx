import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { StreamlineHiringSection } from "@/components/landing/employer-soft-launch";

export const metadata: Metadata = {
  title: "Why MatchLever · Arise Solutions",
  description:
    "Streamline hiring with pre-validated talent — high-signal introductions for employers and hiring managers.",
};

export default function WhyMatchLeverPage() {
  return (
    <div className="min-h-[100svh] bg-[#F7F6F3] text-[#2A2D34]">
      <header className="border-b border-[#2B5B84]/10 bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-7 w-auto" />
            <span className="font-display text-xs font-bold tracking-[0.16em] text-[#2B5B84] uppercase">
              Why MatchLever
            </span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link
              href="/employer/waitlist"
              className="text-[#E87A5D] hover:underline"
            >
              Employer Waitlist
            </Link>
          </div>
        </div>
      </header>

      <StreamlineHiringSection />
    </div>
  );
}
