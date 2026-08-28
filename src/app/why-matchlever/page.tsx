import type { Metadata } from "next";
import Link from "next/link";

import { StreamlineHiringSection } from "@/components/landing/employer-soft-launch";

export const metadata: Metadata = {
  title: "Why MatchLever · Arise Solutions",
  description:
    "Why MatchLever? Streamline hiring with pre-validated talents — high-signal introductions for employers and hiring managers.",
};

export default function WhyMatchLeverPage() {
  return (
    <main className="bg-[#F7F6F3] text-[#2A2D34]">
      <StreamlineHiringSection />
      <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-24">
        <div className="border-t border-[#2B5B84]/10 pt-8">
          <Link
            href="/faq"
            className="inline-flex h-11 items-center justify-center rounded-md border border-[#2B5B84]/25 px-5 font-display text-xs font-semibold tracking-[0.14em] text-[#2B5B84] uppercase transition hover:border-[#E87A5D] hover:text-[#E87A5D]"
          >
            Read the FAQ
          </Link>
        </div>
      </div>
    </main>
  );
}
