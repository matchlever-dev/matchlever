import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { ContactForm } from "@/components/landing/contact-form";

export const metadata: Metadata = {
  title: "Contact Us · MatchLever",
  description: "Get in touch with the MatchLever team.",
};

export default function ContactPage() {
  return (
    <div className="min-h-[100svh] bg-[#F7F6F3] text-[#2A2D34]">
      <header className="border-b border-[#2B5B84]/10 bg-white/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-7 w-auto" />
            <span className="font-display text-xs font-bold tracking-[0.16em] text-[#2B5B84] uppercase">
              Contact
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-[#5B616B] transition hover:text-[#2B5B84]"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
          Support
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#2B5B84] sm:text-4xl">
          Contact us
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-[#2A2D34]/80">
          Questions, bug reports, or partnership ideas — send a note and we&apos;ll
          follow up.
        </p>

        <div className="mt-8">
          <ContactForm />
        </div>
      </main>
    </div>
  );
}
