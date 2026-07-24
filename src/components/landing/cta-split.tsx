"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { WaitlistModal } from "@/components/landing/waitlist-modal";

export function CtaSplit() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  return (
    <section className="relative overflow-hidden bg-[#2B5B84] py-16 text-white sm:py-24 md:py-28">
      <svg
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 hidden h-full w-[55%] opacity-20 sm:block"
        viewBox="0 0 600 700"
        fill="none"
      >
        <path
          d="M20 560 C 180 480, 280 320, 420 250 C 500 210, 560 150, 600 90"
          stroke="#E87A5D"
          strokeWidth="48"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative mx-auto grid max-w-6xl gap-6 px-5 sm:gap-10 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <Link
          href="/onboarding"
          className="group flex min-h-[220px] flex-col justify-between border border-white/20 p-6 transition hover:border-[#E87A5D] sm:min-h-0 sm:p-10"
        >
          <div>
            <p className="font-display text-[11px] font-semibold tracking-[0.28em] text-[#E87A5D] uppercase">
              Seekers
            </p>
            <p className="mt-3 font-display text-xl font-semibold tracking-tight sm:mt-4 sm:text-2xl md:text-3xl">
              I&apos;m Looking for Opportunities
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75 sm:mt-4 sm:text-base">
              Join incognito, sanitize your resume, and publish the signal hirers
              actually use.
            </p>
          </div>
          <span className="mt-8 inline-flex items-center gap-2 font-display text-xs font-semibold tracking-[0.16em] uppercase sm:mt-12">
            Begin onboarding
            <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </span>
        </Link>

        <div className="relative flex min-h-[220px] flex-col justify-between border border-white/15 bg-white/5 p-6 sm:min-h-0 sm:p-10">
          <span className="absolute top-5 right-5 bg-[#E87A5D] px-2.5 py-1 font-display text-[10px] font-bold tracking-[0.2em] text-white uppercase sm:top-6 sm:right-6">
            Coming soon
          </span>
          <div className="pr-16 sm:pr-24">
            <p className="font-display text-[11px] font-semibold tracking-[0.28em] text-white/60 uppercase">
              Hirers
            </p>
            <p className="mt-3 max-w-sm font-display text-xl font-semibold tracking-tight sm:mt-4 sm:text-2xl md:text-3xl">
              I&apos;m Hiring Top Talent
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:mt-4 sm:text-base">
              Exclusive beta for enterprise hiring teams. Join the waitlist for
              early seats.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWaitlistOpen(true)}
            className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#E87A5D] px-5 font-display text-xs font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#d66a4f] sm:mt-12 sm:w-fit"
          >
            Join Exclusive Beta Waitlist
          </button>
        </div>
      </div>

      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </section>
  );
}
