"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { WaitlistModal } from "@/components/landing/waitlist-modal";
import { Button } from "@/components/ui/button";

export function CtaSplit() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  return (
    <section className="bg-[#2A2D34] py-20 text-white sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:px-8 lg:grid-cols-2">
        <Link
          href="/onboarding"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#2B5B84] p-8 transition hover:brightness-110 sm:p-10"
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">
              Seekers
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">
              I&apos;m Looking for Opportunities (Seekers)
            </h2>
            <p className="mt-3 max-w-md text-sm text-white/80 sm:text-base">
              Join incognito, sanitize your résumé, and publish signal hirers
              actually use.
            </p>
          </div>
          <span className="mt-10 inline-flex items-center gap-2 text-sm font-medium">
            Begin onboarding
            <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setWaitlistOpen(true)}
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-8 text-left transition hover:bg-white/10 sm:p-10"
        >
          <span className="absolute top-6 right-6 rounded-md bg-[#E87A5D] px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-white uppercase">
            Coming soon
          </span>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">
              Hirers
            </p>
            <h2 className="mt-3 max-w-sm font-display text-2xl font-semibold sm:text-3xl">
              I&apos;m Hiring Top Talent (Hirers)
            </h2>
            <p className="mt-3 max-w-md text-sm text-white/70 sm:text-base">
              Exclusive beta access for enterprise hiring teams. Join the
              waitlist to get early seats.
            </p>
          </div>
          <Button
            type="button"
            className="mt-10 h-10 w-fit bg-[#E87A5D] text-white hover:bg-[#d66a4f]"
            onClick={(e) => {
              e.stopPropagation();
              setWaitlistOpen(true);
            }}
          >
            Join Exclusive Beta Waitlist
          </Button>
        </button>
      </div>

      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </section>
  );
}
