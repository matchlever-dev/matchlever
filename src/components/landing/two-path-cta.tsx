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
    <section className="bg-white py-6 sm:py-8">
      <div className="mx-auto grid max-w-6xl gap-4 px-5 sm:gap-5 sm:px-8 lg:grid-cols-2">
        <article className="flex flex-col border border-[#2B5B84]/15 bg-[#F7F6F3] p-5 sm:p-6">
          <p className="font-display text-[11px] font-semibold tracking-[0.28em] text-[#E87A5D] uppercase">
            For employers
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-[#2A2D34] sm:text-2xl">
            Hire Exceptional Talent
          </h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-[#5B616B] sm:text-base">
            Your openings matched with best-fit candidates only! No more
            browsing thru fake profiles, we already verified them for you.
          </p>
          <Link
            href={employerHref}
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#E87A5D] px-5 font-display text-xs font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#d66a4f] sm:w-fit"
          >
            {isSignedIn && session.hasEmployerProfile
              ? "Open employer dashboard"
              : "Join Employer Waitlist"}
          </Link>
        </article>

        <article className="flex flex-col border border-[#2B5B84]/15 bg-[#F7F6F3] p-5 sm:p-6">
          <p className="font-display text-[11px] font-semibold tracking-[0.28em] text-[#2B5B84] uppercase">
            For talent
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-[#2A2D34] sm:text-2xl">
            Find Your Next Great Role
          </h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-[#5B616B] sm:text-base">
            Show your true worth here! Match with high-growth companies
            offering opportunities that align perfectly with what you offer.
          </p>
          <Link
            href={
              isSignedIn && session.hasTalentProfile ? talentHref : "/onboarding"
            }
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#2B5B84] px-5 font-display text-xs font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#244e71] sm:w-fit"
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
