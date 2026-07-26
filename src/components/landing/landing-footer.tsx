import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";

export function LandingFooter() {
  return (
    <footer className="border-t border-[#2B5B84]/10 bg-[#F7F6F3]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-12">
        <div className="flex items-center gap-3">
          <BrandMark className="h-8 w-auto" />
          <p className="text-sm text-[#5B616B]">
            No names. No bias. Just the right match.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link
            href="/why-matchlever"
            className="font-semibold text-[#2B5B84] underline-offset-2 transition hover:text-[#E87A5D] hover:underline"
          >
            Why MatchLever
          </Link>
          <Link
            href="/login"
            className="text-[#5B616B] transition hover:text-[#2B5B84]"
          >
            Log in
          </Link>
          <Link
            href="/legal/seekers"
            className="text-[#5B616B] transition hover:text-[#2B5B84]"
          >
            Seeker Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
