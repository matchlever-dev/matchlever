"use client";

import Link from "next/link";
import {
  BadgeCheck,
  CircleDollarSign,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Workflow,
} from "lucide-react";

const VALUE_PROPS = [
  {
    icon: ShieldCheck,
    title: "Pre-Validated Talent",
    body: "Access top-tier talent with fully verified professional references before you ever review a profile.",
  },
  {
    icon: BadgeCheck,
    title: "Zero Noise Matching",
    body: "Receive high-confidence matches only — never unvetted applicants flooding your pipeline.",
  },
  {
    icon: CircleDollarSign,
    title: "Pay-Per-Match Pricing",
    body: "Pay only when you accept a match. Additional matches for that role are free until filled or set inactive.",
  },
  {
    icon: Sparkles,
    title: "First Match Free",
    body: "Early-access employers in the soft launch receive their first accepted match 100% free.",
  },
] as const;

const PROCESS_STEPS = [
  {
    step: "1",
    title: "Talent verified via references",
    body: "Professionals complete reference verification before entering the match pool.",
  },
  {
    step: "2",
    title: "Employer & job posting verified",
    body: "We validate hiring teams and role requirements during soft launch onboarding.",
  },
  {
    step: "3",
    title: "High-match engine runs",
    body: "MatchLever surfaces incognito profiles that meet your role signal — not volume.",
  },
  {
    step: "4",
    title: "Accept, unlock, hire",
    body: "Accept an incognito profile, unlock the full resume, and the match fee applies (waived for your first match).",
  },
] as const;

export function EmployerSoftLaunchSection({ showCta = true }: { showCta?: boolean }) {
  return (
    <section className="border-y border-[#2B5B84]/10 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-3xl">
          <p className="font-display text-[11px] font-semibold tracking-[0.28em] text-[#E87A5D] uppercase">
            Employer Soft Launch
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#2B5B84] sm:text-4xl">
            Streamline hiring with pre-validated talent
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#5B616B] sm:text-lg">
            MatchLever is opening employer access for organizations that want
            high-signal introductions — not another applicant tracking firehose.
          </p>
          <p className="mt-3 text-sm text-[#5B616B]">
            <span className="font-semibold text-[#2A2D34]">Employers</span>{" "}
            includes both company recruiters and hiring managers building teams
            directly.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map((item) => (
            <div
              key={item.title}
              className="border border-[#2B5B84]/12 bg-[#F7F6F3] p-5"
            >
              <item.icon className="size-5 text-[#2B5B84]" aria-hidden />
              <h3 className="mt-4 font-display text-sm font-semibold tracking-wide text-[#2A2D34] uppercase">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5B616B]">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14">
          <div className="flex items-center gap-2">
            <Workflow className="size-5 text-[#E87A5D]" aria-hidden />
            <h3 className="font-display text-lg font-semibold text-[#2B5B84]">
              How MatchLever works for employers
            </h3>
          </div>
          <ol className="mt-6 grid gap-4 lg:grid-cols-4">
            {PROCESS_STEPS.map((step, index) => (
              <li
                key={step.step}
                className="relative border border-[#2B5B84]/12 p-5"
              >
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#2B5B84] font-display text-xs font-bold text-white">
                  {step.step}
                </span>
                <h4 className="mt-4 font-display text-sm font-semibold text-[#2A2D34]">
                  {step.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-[#5B616B]">
                  {step.body}
                </p>
                {index < PROCESS_STEPS.length - 1 && (
                  <UserCheck
                    aria-hidden
                    className="absolute top-1/2 -right-3 hidden size-5 -translate-y-1/2 text-[#E87A5D] lg:block"
                  />
                )}
              </li>
            ))}
          </ol>
        </div>

        {showCta && (
          <div className="mt-10">
            <Link
              href="/employer/waitlist#waitlist-form"
              className="inline-flex h-12 items-center justify-center rounded-md bg-[#E87A5D] px-8 font-display text-xs font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#d66a4f]"
            >
              Join the Employer Waitlist
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
