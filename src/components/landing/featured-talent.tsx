import Link from "next/link";

import type { FeaturedTalent } from "@/lib/onboarding/featured-talent";

export function FeaturedTalentSection({
  talent,
}: {
  talent: FeaturedTalent[];
}) {
  return (
    <section id="featured" className="relative bg-white py-16 sm:py-24 md:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="font-display text-[11px] font-semibold tracking-[0.28em] text-[#E87A5D] uppercase">
          Featured talent
        </p>
        <h2 className="mt-3 max-w-2xl font-display text-2xl font-semibold tracking-tight text-[#2A2D34] sm:mt-4 sm:text-3xl md:text-4xl">
          Meet the talent driving tomorrow&apos;s growth.
        </h2>

        <div className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {talent.map((person) => (
            <TalentCard key={person.id} person={person} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TalentCard({ person }: { person: FeaturedTalent }) {
  const initial = person.firstName.charAt(0).toUpperCase() || "T";

  return (
    <article className="flex flex-col border border-[#2B5B84]/15 bg-[#F7F6F3] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        {person.imageUrl ? (
          // External auth provider avatars; domains vary by identity provider.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.imageUrl}
            alt=""
            width={48}
            height={48}
            className="size-12 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#2B5B84] font-display text-lg font-bold text-white"
          >
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display text-base font-semibold tracking-tight text-[#2A2D34]">
            {person.firstName}
          </p>
          <p className="truncate text-sm text-[#2B5B84]">{person.title}</p>
        </div>
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-[#5B616B]">
        {person.tagline}
      </p>

      <p className="mt-4 text-sm font-medium text-[#2A2D34]">
        {person.superPower}
      </p>

      <Link
        href={person.profileHref}
        className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md border border-[#2B5B84]/25 bg-white px-4 font-display text-xs font-semibold tracking-[0.14em] text-[#2B5B84] uppercase transition hover:border-[#E87A5D] hover:text-[#E87A5D]"
      >
        View Profile
      </Link>
    </article>
  );
}
