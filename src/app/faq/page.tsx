import type { Metadata } from "next";
import Link from "next/link";

import { FaqAnswer } from "@/lib/marketing/faq-answer";
import { getFaqItems } from "@/lib/marketing/faq.server";

export const metadata: Metadata = {
  title: "FAQ - MatchLever",
  description:
    "Frequently asked questions about MatchLever - privacy, matching, references, and how the platform works.",
};

export default async function FaqPage() {
  const items = await getFaqItems();

  return (
    <main className="mx-auto max-w-3xl bg-[#F7F6F3] px-5 py-10 text-[#2A2D34] sm:px-8 sm:py-14">
      <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
        Help
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#2B5B84] sm:text-4xl">
        Frequently asked questions
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#2A2D34]/80">
        Answers to common questions about how MatchLever works for talent and
        employers.
      </p>

      <div className="mt-10 divide-y divide-[#2B5B84]/10 border-y border-[#2B5B84]/10">
        {items.map((item) => (
          <section key={item.id} className="py-8 first:pt-8 last:pb-8">
            <h2 className="font-display text-xl font-semibold text-[#2B5B84]">
              {item.question}
            </h2>
            <div className="mt-4">
              <FaqAnswer answer={item.answer} />
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-3 border-t border-[#2B5B84]/10 pt-8">
        <Link
          href="/contact"
          className="inline-flex h-11 items-center justify-center rounded-md bg-[#2B5B84] px-5 font-display text-xs font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#244e71]"
        >
          Contact us
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-md border border-[#2B5B84]/25 px-5 font-display text-xs font-semibold tracking-[0.14em] text-[#2B5B84] uppercase transition hover:border-[#E87A5D] hover:text-[#E87A5D]"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
