import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { WHY_MATCHLEVER } from "@/lib/marketing/why-matchlever";

export const metadata: Metadata = {
  title: "Why MatchLever · Arise Solutions",
  description:
    "Why we built MatchLever — faster, smarter matching for vetted seekers and hiring teams.",
};

export default function WhyMatchLeverPage() {
  return (
    <div className="min-h-[100svh] bg-[#F7F6F3] text-[#2A2D34]">
      <header className="border-b border-[#2B5B84]/10 bg-white/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-7 w-auto" />
            <span className="font-display text-xs font-bold tracking-[0.16em] text-[#2B5B84] uppercase">
              Why MatchLever
            </span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link
              href="/login"
              className="text-[#2B5B84] hover:underline"
            >
              Log in
            </Link>
            <Link
              href="/onboarding"
              className="text-[#E87A5D] hover:underline"
            >
              Start as a Seeker
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
          {WHY_MATCHLEVER.eyebrow}
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#2B5B84] sm:text-4xl">
          {WHY_MATCHLEVER.title}
        </h1>

        <div className="mt-10 space-y-10">
          {WHY_MATCHLEVER.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-xl font-semibold text-[#2B5B84]">
                {section.heading}
              </h2>
              {"body" in section && section.body && (
                <p className="mt-3 text-base leading-relaxed text-[#2A2D34]/80">
                  {section.body}
                </p>
              )}
              {"after" in section && section.after && (
                <p className="mt-4 text-base leading-relaxed text-[#2A2D34]/80">
                  {section.after}
                </p>
              )}
              {"bullets" in section && section.bullets && (
                <ul className="mt-4 space-y-4">
                  {section.bullets.map((item) => (
                    <li key={item.label}>
                      <p className="font-display text-sm font-semibold tracking-wide text-[#E87A5D]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-base leading-relaxed text-[#2A2D34]/80">
                        {item.text}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3 border-t border-[#2B5B84]/10 pt-8">
          <Link
            href="/onboarding"
            className="inline-flex h-11 items-center justify-center rounded-md bg-[#2B5B84] px-5 font-display text-xs font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#244e71]"
          >
            Start as a Seeker
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md border border-[#2B5B84]/25 px-5 font-display text-xs font-semibold tracking-[0.14em] text-[#2B5B84] uppercase transition hover:border-[#E87A5D] hover:text-[#E87A5D]"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
