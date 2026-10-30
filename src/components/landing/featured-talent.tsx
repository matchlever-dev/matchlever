import { EyeOff } from "lucide-react";

import type { FeaturedTalent } from "@/lib/onboarding/featured-talent";

const TAGLINE_MAX_LENGTH = 60;

function truncateTagline(tagline: string): string {
  const trimmed = tagline.trim();
  if (trimmed.length <= TAGLINE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, TAGLINE_MAX_LENGTH).trimEnd()}...`;
}

export function FeaturedTalentSection({
  talent,
}: {
  talent: FeaturedTalent[];
}) {
  return (
    <section id="featured" className="relative bg-white py-8 sm:py-10">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="font-display text-[11px] font-semibold tracking-[0.28em] text-[#E87A5D] uppercase">
          Featured talent
        </p>
        <h2 className="mt-2 max-w-2xl font-display text-xl font-semibold tracking-tight text-[#2A2D34] sm:text-2xl md:text-3xl">
          Meet the talent driving tomorrow&apos;s growth.
        </h2>

        <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {talent.map((person) => (
            <TalentCard key={person.id} person={person} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TalentCard({ person }: { person: FeaturedTalent }) {
  return (
    <article className="flex flex-col border border-[#2B5B84]/15 bg-[#F7F6F3] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#2B5B84] text-white"
          title="Identity hidden until a match is accepted"
        >
          <EyeOff className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold tracking-tight text-[#2A2D34] sm:text-lg">
            {person.title}
          </h3>
        </div>
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-[#5B616B]">
        {truncateTagline(person.tagline)}
      </p>

      <p className="mt-4 text-sm font-medium text-[#2A2D34]">
        {person.superPower}
      </p>
    </article>
  );
}
