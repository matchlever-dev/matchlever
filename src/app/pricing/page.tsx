import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Handshake, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Employer Pricing - MatchLever",
  description:
    "Simple, transparent employer pricing. Self-serve matches from $600 (first match free) or full-service recruiting paid only on hire. Always 100% free for talent.",
};

const PLANS = [
  {
    id: "self-serve",
    name: "Self-Serve Match",
    price: "$600",
    priceSuffix: "/ match",
    hook: "First match is 100% Free",
    description:
      "We send you a highly vetted candidate profile. You unlock it and take over the interviewing and hiring process.",
    guarantee:
      "5-Match Guarantee. If you review the resume and decline to interview, we replace the match for free (up to 4 times).",
    bestFor:
      "Startups and hands-on founders who want to skip job-board spam but handle their own interviews.",
    ctaLabel: "Post a Job",
    ctaHref: "/employer/onboarding#employer-form",
    featured: false,
    icon: Sparkles,
  },
  {
    id: "full-service",
    name: "Full-Service Recruiting",
    price: "1 Month Salary",
    priceSuffix: "Paid only on hire",
    hook: "Zero upfront cost",
    description:
      "We act as your dedicated recruiter. We source, screen, and coordinate until the candidate signs the offer.",
    guarantee:
      "Pure contingency. If we don't fill the seat, you don't pay a dime. (Minimum fee of $4,500 applies).",
    bestFor:
      "Busy teams lacking internal HR who just want a qualified hire delivered to the finish line.",
    ctaLabel: "Book a Call",
    ctaHref: "/contact",
    featured: true,
    icon: Handshake,
  },
] as const;

export default function PricingPage() {
  return (
    <main className="bg-[#F7F6F3] text-[#2A2D34]">
      <section className="border-b border-[#2B5B84]/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
            For employers
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#2B5B84] sm:text-4xl">
            Employer Pricing
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#5B616B] sm:text-lg">
            Simple, transparent pricing. (Always 100% free for talent).
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <article
                key={plan.id}
                className={
                  plan.featured
                    ? "group flex flex-col border-2 border-[#E87A5D]/40 bg-white p-6 shadow-[0_1px_0_rgba(43,91,132,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[#E87A5D] hover:shadow-[0_12px_32px_rgba(43,91,132,0.12)] sm:p-8"
                    : "group flex flex-col border border-[#2B5B84]/15 bg-white p-6 shadow-[0_1px_0_rgba(43,91,132,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[#2B5B84]/40 hover:shadow-[0_12px_32px_rgba(43,91,132,0.12)] sm:p-8"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={
                        plan.featured
                          ? "font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase"
                          : "font-display text-[11px] font-semibold tracking-[0.22em] text-[#2B5B84] uppercase"
                      }
                    >
                      {plan.featured ? "Full service" : "Self-serve"}
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[#2A2D34]">
                      {plan.name}
                    </h2>
                  </div>
                  <span
                    className={
                      plan.featured
                        ? "inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-[#E87A5D]/10 text-[#E87A5D] transition group-hover:bg-[#E87A5D]/15"
                        : "inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-[#2B5B84]/10 text-[#2B5B84] transition group-hover:bg-[#2B5B84]/15"
                    }
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                </div>

                <div className="mt-6">
                  <p className="font-display text-3xl font-semibold tracking-tight text-[#2B5B84] sm:text-4xl">
                    {plan.price}
                    {plan.priceSuffix.startsWith("/") ? (
                      <span className="ml-1 text-base font-medium text-[#5B616B]">
                        {plan.priceSuffix}
                      </span>
                    ) : null}
                  </p>
                  {!plan.priceSuffix.startsWith("/") ? (
                    <p className="mt-1 text-sm font-medium text-[#5B616B]">
                      {plan.priceSuffix}
                    </p>
                  ) : null}
                  <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#F7F6F3] px-3 py-1.5 text-sm font-semibold text-[#E87A5D]">
                    <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                    {plan.hook}
                  </p>
                </div>

                <p className="mt-6 text-base leading-relaxed text-[#5B616B]">
                  {plan.description}
                </p>

                <dl className="mt-6 space-y-4 border-t border-[#2B5B84]/10 pt-6">
                  <div>
                    <dt className="font-display text-xs font-semibold tracking-[0.14em] text-[#2B5B84] uppercase">
                      The Guarantee
                    </dt>
                    <dd className="mt-2 text-sm leading-relaxed text-[#5B616B]">
                      {plan.guarantee}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-display text-xs font-semibold tracking-[0.14em] text-[#2B5B84] uppercase">
                      Best For
                    </dt>
                    <dd className="mt-2 text-sm leading-relaxed text-[#5B616B]">
                      {plan.bestFor}
                    </dd>
                  </div>
                </dl>

                <div className="mt-8 flex flex-1 flex-col justify-end">
                  <Link
                    href={plan.ctaHref}
                    className={
                      plan.featured
                        ? "inline-flex h-12 w-full items-center justify-center rounded-md bg-[#E87A5D] px-6 font-display text-xs font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#d66a4f]"
                        : "inline-flex h-12 w-full items-center justify-center rounded-md bg-[#2B5B84] px-6 font-display text-xs font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#244e71]"
                    }
                  >
                    {plan.ctaLabel}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-12 flex flex-wrap gap-3 border-t border-[#2B5B84]/10 pt-8">
          <Link
            href="/why-matchlever"
            className="inline-flex h-11 items-center justify-center rounded-md border border-[#2B5B84]/25 px-5 font-display text-xs font-semibold tracking-[0.14em] text-[#2B5B84] uppercase transition hover:border-[#E87A5D] hover:text-[#E87A5D]"
          >
            Why MatchLever
          </Link>
          <Link
            href="/faq"
            className="inline-flex h-11 items-center justify-center rounded-md border border-[#2B5B84]/25 px-5 font-display text-xs font-semibold tracking-[0.14em] text-[#2B5B84] uppercase transition hover:border-[#E87A5D] hover:text-[#E87A5D]"
          >
            Read the FAQ
          </Link>
        </div>
      </section>
    </main>
  );
}
