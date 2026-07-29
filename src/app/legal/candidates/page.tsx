import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { SEEKER_TOS } from "@/lib/legal/seeker-tos";
import { SEEKER_TOS_SECTIONS } from "@/lib/legal/seeker-tos-content";

export const metadata: Metadata = {
  title: "Seeker Terms of Service · MatchLever",
  description:
    "Job Seeker Terms of Service for the MatchLever talent exchange.",
};

export default function SeekerTermsPage() {
  return (
    <div className="min-h-[100svh] bg-[#F7F6F3] text-[#2A2D34]">
      <header className="border-b border-[#2B5B84]/10 bg-white/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-7 w-auto" />
            <span className="font-display text-xs font-bold tracking-[0.16em] uppercase">
              Legal
            </span>
          </Link>
          <a
            href={SEEKER_TOS.pdfPath}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[#2B5B84] hover:underline"
          >
            Download PDF
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
          Arise Solutions LLC
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#2B5B84]">
          {SEEKER_TOS.title}
        </h1>
        <p className="mt-2 text-sm text-[#5B616B]">
          Effective Date: {SEEKER_TOS.effectiveDate}
        </p>
        <p className="mt-6 text-sm leading-relaxed text-[#2A2D34]/80">
          Welcome to MatchLever. MatchLever is a bias-free enterprise talent
          exchange connecting top-tier candidates and hiring organizations. The
          MatchLever platform, including all associated code, database schemas,
          and data, is wholly owned and operated by Arise Solutions LLC.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[#2A2D34]/80">
          By registering as a &quot;Seeker&quot; and using the MatchLever
          platform to unlock your potential, you agree to these Job Seeker Terms
          of Service (&quot;Terms&quot;).
        </p>

        <div className="mt-10 space-y-8">
          {SEEKER_TOS_SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-lg font-semibold text-[#2B5B84]">
                {section.heading}
              </h2>
              {"intro" in section && section.intro && (
                <p className="mt-3 text-sm leading-relaxed text-[#2A2D34]/80">
                  {section.intro}
                </p>
              )}
              {"body" in section && section.body && (
                <p className="mt-3 text-sm leading-relaxed text-[#2A2D34]/80">
                  {section.body}
                </p>
              )}
              {"bullets" in section && section.bullets && (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#2A2D34]/80">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p className="mt-12 text-xs text-[#5B616B]">
          The{" "}
          <a
            href={SEEKER_TOS.pdfPath}
            className="font-medium text-[#2B5B84] underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            PDF Terms of Service
          </a>{" "}
          is the authoritative version of this agreement.
        </p>

        <Link
          href="/onboarding"
          className="mt-8 inline-flex text-sm font-medium text-[#2B5B84] hover:underline"
        >
          ← Back to onboarding
        </Link>
      </main>
    </div>
  );
}
