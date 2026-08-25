"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { BrandWordmark } from "@/components/brand/brand-mark";
import { useNavSession } from "@/components/brand/nav-session-provider";
import { DEFAULT_HERO_TAGLINES } from "@/lib/marketing/site-copy";

const TAGLINE_INTERVAL_MS = 3000;

function RotatingHeroTagline({
  taglines,
}: {
  taglines: [string, string, string];
}) {
  const [index, setIndex] = useState(0);
  const lines = taglines.length === 3 ? taglines : [...DEFAULT_HERO_TAGLINES];

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % lines.length);
    }, TAGLINE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [lines.length]);

  return (
    <h1 className="max-w-xl font-display text-[1.125rem] font-semibold leading-snug tracking-tight text-[#2A2D34] sm:max-w-2xl sm:text-[1.25rem] md:text-[1.375rem]">
      <span className="sr-only">{lines.join(". ")}</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={lines[index]}
          aria-hidden
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="block"
        >
          {lines[index]}
        </motion.span>
      </AnimatePresence>
    </h1>
  );
}

export function LandingHero({
  heroTaglines = [...DEFAULT_HERO_TAGLINES],
}: {
  heroTaglines?: [string, string, string];
}) {
  const { session, ready } = useNavSession();
  const isSignedIn = ready && session.authenticated;
  const dashboardHref = session.dashboardHref || "/dashboard/employer";

  return (
    <section className="relative isolate overflow-hidden bg-[#F7F6F3]">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(43,91,132,0.12),transparent_50%),radial-gradient(ellipse_at_85%_15%,rgba(232,122,93,0.14),transparent_45%),linear-gradient(180deg,#F7F6F3_0%,#F3F1EC_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30 mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
        }}
      />

      <svg
        aria-hidden
        className="pointer-events-none absolute -right-[30%] top-[8%] hidden h-[78%] w-[78%] text-[#2B5B84] opacity-[0.08] sm:block"
        viewBox="0 0 800 600"
        fill="none"
      >
        <path
          d="M40 440 C 240 360, 380 210, 560 150 C 660 115, 730 85, 790 40"
          stroke="currentColor"
          strokeWidth="64"
          strokeLinecap="round"
        />
        <path
          d="M90 500 C 280 430, 420 280, 590 220 C 690 185, 750 145, 800 100"
          stroke="#E87A5D"
          strokeWidth="28"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col justify-start px-5 pb-10 pt-6 sm:px-8 sm:pb-12 sm:pt-8">
        <div className="flex flex-col items-start gap-3 sm:gap-4">
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
          >
            <BrandWordmark />
          </motion.div>

          <div className="h-px w-14 bg-gradient-to-r from-[#2B5B84] to-[#E87A5D] sm:w-20" />

          <RotatingHeroTagline taglines={heroTaglines} />

          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link
              href="/onboarding"
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#2B5B84] px-6 font-display text-xs font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#244e71] sm:w-auto"
            >
              Start as a Talent
            </Link>
            <a
              href="#featured"
              className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#2B5B84]/25 bg-transparent px-6 font-display text-xs font-semibold tracking-[0.14em] text-[#2B5B84] uppercase transition hover:border-[#E87A5D] hover:text-[#E87A5D] sm:w-auto"
            >
              Browse Talent
            </a>
          </div>

          <div className="rounded-md border border-[#E87A5D]/35 bg-[#E87A5D]/10 px-3 py-2.5 sm:max-w-xl sm:px-4 sm:py-3">
            <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
              Employer Soft Launch
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#2A2D34]">
              Hiring teams and hiring managers: join the waitlist for
              pre-validated talent matching with zero-noise introductions.
            </p>
            <p className="mt-1 text-xs text-[#5B616B]">
              Employers includes both company recruiters and hiring managers.
            </p>
            <Link
              href="/employer/waitlist"
              className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-[#E87A5D] px-5 font-display text-xs font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#d66a4f]"
            >
              Join the Employer Waitlist
            </Link>
          </div>
          <p className="text-xs text-[#5B616B] sm:text-sm">
            {!ready ? null : isSignedIn ? (
              <>
                Welcome back.{" "}
                <Link
                  href={dashboardHref}
                  className="font-semibold text-[#2B5B84] underline underline-offset-2"
                >
                  Open your dashboard
                </Link>
              </>
            ) : (
              <>
                Already joined?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[#2B5B84] underline underline-offset-2"
                >
                  Log in to your dashboard
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
