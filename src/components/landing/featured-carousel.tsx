"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Globe2, Layers } from "lucide-react";

import { FEATURED_CANDIDATES } from "@/lib/onboarding/featured-candidates";

export function FeaturedCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % FEATURED_CANDIDATES.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  const candidate = FEATURED_CANDIDATES[index];

  return (
    <section
      id="featured"
      className="relative border-y border-[#2B5B84]/10 bg-[#F8F9FA] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
          Featured seekers
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-[#2B5B84] sm:text-4xl">
          Talent matched to your working hours—not just your job description.
        </h2>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <div className="relative min-h-[280px] overflow-hidden rounded-2xl bg-[#2B5B84] text-white">
            <AnimatePresence mode="wait">
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35 }}
                className="flex h-full flex-col justify-between p-8 sm:p-10"
              >
                <div>
                  <p className="text-sm text-white/70">
                    {candidate.yearsExperience}+ years · {candidate.locationMode}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
                    {candidate.anonymousTitle}
                  </h3>
                  <p className="mt-4 max-w-lg text-base text-white/90 sm:text-lg">
                    {candidate.tagline}
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-2">
                  {candidate.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium tracking-wide"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <OverlapBadge
              icon={<Globe2 className="size-4" />}
              label="Timezone"
              value={`${candidate.timezoneLabel} · ${candidate.timezone}`}
            />
            <OverlapBadge
              icon={<Clock className="size-4" />}
              label="Working hours"
              value={candidate.workHours}
            />
            <OverlapBadge
              icon={<Layers className="size-4" />}
              label="Overlap"
              value={candidate.overlapBadge}
              accent
            />

            <div className="mt-4 flex gap-2">
              {FEATURED_CANDIDATES.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show candidate ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 flex-1 rounded-full transition ${
                    i === index ? "bg-[#E87A5D]" : "bg-[#2B5B84]/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OverlapBadge({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
        accent
          ? "border-[#E87A5D]/40 bg-[#E87A5D]/10"
          : "border-[#2B5B84]/15 bg-white"
      }`}
    >
      <span
        className={`mt-0.5 ${accent ? "text-[#E87A5D]" : "text-[#2B5B84]"}`}
      >
        {icon}
      </span>
      <div>
        <p className="text-xs font-medium tracking-wide text-[#2A2D34]/55 uppercase">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-[#2A2D34]">{value}</p>
      </div>
    </div>
  );
}
