"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function LandingHero() {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,#2B5B84_0%,transparent_55%),radial-gradient(ellipse_at_80%_10%,#E87A5D55_0%,transparent_45%),linear-gradient(160deg,#F8F9FA_0%,#e8eef4_45%,#d7e3ee_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232B5B84' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-full max-w-2xl bg-[linear-gradient(120deg,transparent_0%,#2B5B8422_40%,#E87A5D33_100%)]"
      />

      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-6 py-20 sm:px-8">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display text-5xl font-semibold tracking-tight text-[#2B5B84] sm:text-7xl md:text-8xl"
        >
          MatchLever
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="mt-6 max-w-2xl text-2xl font-medium leading-tight text-[#2A2D34] sm:text-3xl md:text-4xl"
        >
          Enterprise software talent, anonymized until the fit is real.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="mt-4 max-w-xl text-base text-[#2A2D34]/75 sm:text-lg"
        >
          Seekers stay incognito. Hirers see signal—skills, overlap hours, and
          verified references—not résumés stuffed with noise.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24 }}
          className="mt-10 flex flex-wrap gap-3"
        >
          <Link
            href="/onboarding"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[#2B5B84] px-5 text-sm font-medium text-white transition hover:bg-[#244e71]"
          >
            Start as a Seeker
          </Link>
          <a
            href="#featured"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-[#2B5B84]/30 bg-white/50 px-5 text-sm font-medium text-[#2B5B84] backdrop-blur transition hover:bg-white"
          >
            Browse featured talent
          </a>
        </motion.div>
      </div>
    </section>
  );
}
