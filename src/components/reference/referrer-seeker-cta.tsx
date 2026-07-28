import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ReferrerSeekerCta({ className = "" }: { className?: string }) {
  return (
    <aside
      className={`border border-[#2B5B84]/15 bg-white p-5 ${className}`.trim()}
    >
      <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
        Your turn?
      </p>
      <h3 className="mt-2 font-display text-lg font-semibold tracking-tight text-[#2B5B84]">
        Go incognito and get matched with openings from eager recruiters
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#5B616B]">
        You just saw how MatchLever works from the reference side. Create your
        own anonymous seeker profile and let recruiters come to you.
      </p>
      <Link
        href="/onboarding"
        className="mt-4 inline-flex items-center gap-2 bg-[#E87A5D] px-4 py-2.5 font-display text-xs font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#d96b4f]"
      >
        Start as an incognito seeker
        <ArrowRight className="size-3.5" />
      </Link>
    </aside>
  );
}
