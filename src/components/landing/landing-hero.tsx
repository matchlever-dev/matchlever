"use client";

import Link from "next/link";

import { useNavSession } from "@/components/brand/nav-session-provider";

export function LandingHero() {
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
          <div className="h-px w-14 bg-gradient-to-r from-[#2B5B84] to-[#E87A5D] sm:w-20" />

          <h1 className="max-w-3xl font-display text-3xl font-semibold tracking-tight text-[#2A2D34] sm:text-4xl md:text-5xl">
            Match with Top-Tier Talent & Opportunities
          </h1>

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
