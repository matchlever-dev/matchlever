"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { BrandMark, BrandWordmark } from "@/components/brand/brand-mark";

const HERO_TAGLINES = [
  "Upload your profile, find your match",
  "Where Tech Talent Meets Tech Innovators",
  "Your Lever into the Tech Industry",
] as const;

const TAGLINE_INTERVAL_MS = 3000;

function RotatingHeroTagline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_TAGLINES.length);
    }, TAGLINE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <h1 className="max-w-xl font-display text-[1.5rem] font-semibold leading-[1.2] tracking-tight text-[#2A2D34] sm:max-w-2xl sm:text-[1.75rem] md:text-[2rem]">
      <span className="sr-only">{HERO_TAGLINES.join(". ")}</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={HERO_TAGLINES[index]}
          aria-hidden
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="block"
        >
          {HERO_TAGLINES[index]}
        </motion.span>
      </AnimatePresence>
    </h1>
  );
}

export function LandingHero() {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-[#F7F6F3]">
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

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-start px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14">
        <div className="flex flex-col items-start gap-5 sm:gap-6">
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:gap-5"
          >
            <BrandMark
              priority
              className="h-20 w-auto sm:h-28 md:h-32"
            />
            <BrandWordmark className="pb-0.5 sm:pb-1" />
          </motion.div>

          <div className="h-px w-16 bg-gradient-to-r from-[#2B5B84] to-[#E87A5D] sm:w-24" />

          <RotatingHeroTagline />

          <p className="max-w-lg text-base leading-relaxed text-[#5B616B] sm:text-xl">
            Connect with vetted talents at no cost until a match is made.
          </p>

          <div className="flex w-full flex-col gap-3 pt-1 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link
              href="/onboarding"
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-[#2B5B84] px-6 font-display text-xs font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#244e71] sm:w-auto"
            >
              Start as a Candidate
            </Link>
            <a
              href="#featured"
              className="inline-flex h-12 w-full items-center justify-center rounded-md border border-[#2B5B84]/25 bg-transparent px-6 font-display text-xs font-semibold tracking-[0.14em] text-[#2B5B84] uppercase transition hover:border-[#E87A5D] hover:text-[#E87A5D] sm:w-auto"
            >
              Browse Talent
            </a>
          </div>
          <p className="text-sm text-[#5B616B]">
            Already joined?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#2B5B84] underline underline-offset-2"
            >
              Log in to your dashboard
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
