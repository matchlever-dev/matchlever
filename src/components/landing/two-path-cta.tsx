"use client";

import Link from "next/link";

import { useNavSession } from "@/components/brand/nav-session-provider";

export function TwoPathCta() {
  const { session, ready } = useNavSession();
  const isSignedIn = ready && session.authenticated;
  const talentHref = session.hasTalentProfile
    ? "/dashboard/talent"
    : "/onboarding";
  const employerHref = session.hasEmployerProfile
    ? "/dashboard/employer"
    : "/employer/waitlist";

  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-5 px-5 sm:gap-6 sm:px-8 lg:grid-cols-2">
        <article className="flex flex-col border border-[#2B5B84]/15 bg-[#F7F6F3] p-6 sm:p-8">
          <p className="font-display text-[11px] font-semibold tracking-[0.28em] text-[#E87A5D] uppercase">
            For employers
          </p>
          <h2 className="mt-3 font-display text-xl font-semibold tracking-tight text-[#2A2D34] sm:text-2xl">
            Hire Exceptional Talent
          </h2>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-[#5B616B] sm:text-base">
            Access a curated network of vetted professionals ready to integrate
            with your team, accelerate your roadmap, and deliver immediate
            results.
          </p>
          <Link
            href={employerHref}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#E87A5D] px-5 font-display text-xs font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#d66a4f] sm:w-fit"
          >
            {isSignedIn && session.hasEmployerProfile
              ? "Open employer dashboard"
              : "Join Employer Waitlist"}
          </Link>
        </article>

        <article className="flex flex-col border border-[#2B5B84]/15 bg-[#F7F6F3] p-6 sm:p-8">
          <p className="font-display text-[11px] font-semibold tracking-[0.28em] text-[#2B5B84] uppercase">
            For talent
          </p>
          <h2 className="mt-3 font-display text-xl font-semibold tracking-tight text-[#2A2D34] sm:text-2xl">
            Find Your Next Great Role
          </h2>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-[#5B616B] sm:text-base">
            Take control of your career trajectory. Match with high-growth
            companies offering impactful, flexible projects that align perfectly
            with your expertise.
          </p>
          <Link
            href={
              isSignedIn && session.hasTalentProfile ? talentHref : "/onboarding"
            }
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#2B5B84] px-5 font-display text-xs font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#244e71] sm:w-fit"
          >
            {isSignedIn && session.hasTalentProfile
              ? "Open talent profile"
              : "Apply as Talent"}
          </Link>
        </article>
      </div>
    </section>
  );
}
