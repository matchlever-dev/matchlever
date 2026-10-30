import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { EMPLOYER_TOS } from "@/lib/legal/employer-tos";
import { EMPLOYER_TOS_SECTIONS } from "@/lib/legal/employer-tos-content";

export const metadata: Metadata = {
  title: "Employer Terms of Service · MatchLever",
  description:
    "Employer Terms of Service for the MatchLever matching engine — not a recruiting agency.",
};

export default function EmployerTermsPage() {
  return (
    <div className="flex min-h-[100svh] flex-col bg-[#F7F6F3] text-[#2A2D34]">
      <header className="border-b border-[#2B5B84]/10 bg-white/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-10 w-auto" />
            <span className="font-display text-xs font-bold tracking-[0.16em] uppercase">
              Legal
            </span>
          </Link>
          <Link
            href="/legal/talent"
            className="text-xs font-medium text-[#2B5B84] hover:underline"
          >
            Talent Terms
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8">
        <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
          {EMPLOYER_TOS.owner}
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#2B5B84]">
          {EMPLOYER_TOS.title}
        </h1>
        <p className="mt-2 text-sm text-[#5B616B]">
          Effective Date: {EMPLOYER_TOS.effectiveDate}
        </p>
        <p className="mt-6 text-sm leading-relaxed text-[#2A2D34]/80">
          Welcome to MatchLever. MatchLever is a bias-aware enterprise talent
          matching engine connecting hiring organizations with pre-signal
          talent profiles. The MatchLever platform, including all associated
          code, database schemas, and data, is wholly owned and operated by{" "}
          {EMPLOYER_TOS.owner}.
        </p>
        <p className="mt-4 rounded-md border border-[#E87A5D]/25 bg-[#E87A5D]/10 px-4 py-3 text-sm leading-relaxed text-[#2A2D34]">
          <span className="font-semibold text-[#2B5B84]">Important:</span>{" "}
          MatchLever is a matching engine — not a recruiting agent, staffing
          firm, or search firm. We do not guarantee candidate quality, interview
          outcomes, or hires.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[#2A2D34]/80">
          By registering as an Employer and using MatchLever to post roles,
          receive matches, or unlock talent profiles, you agree to these
          Employer Terms of Service (&quot;Terms&quot;).
        </p>

        <div className="mt-10 space-y-8">
          {EMPLOYER_TOS_SECTIONS.map((section) => (
            <section key={section.heading} id={section.heading.split(".")[0]}>
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
                    <li key={item.slice(0, 48)}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p className="mt-12 text-xs text-[#5B616B]">
          This page is the authoritative Employer Terms of Service for
          MatchLever employer accounts.
        </p>

        <div className="mt-8 flex flex-wrap gap-4 text-sm font-medium text-[#2B5B84]">
          <Link href="/employer/onboarding" className="hover:underline">
            ← Back to employer onboarding
          </Link>
          <Link href="/dashboard/employer/jobs/new" className="hover:underline">
            Post a job opening
          </Link>
        </div>
      </main>
    </div>
  );
}
