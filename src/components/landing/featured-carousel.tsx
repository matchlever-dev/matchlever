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
    <section id="featured" className="relative bg-white py-16 sm:py-24 md:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="font-display text-[11px] font-semibold tracking-[0.28em] text-[#E87A5D] uppercase">
          Featured candidates
        </p>
        <h2 className="mt-3 max-w-2xl font-display text-2xl font-semibold tracking-tight text-[#2A2D34] sm:mt-4 sm:text-3xl md:text-4xl">
          Matched to your working hours—not just your job description.
        </h2>

        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-10">
          <div className="relative min-h-[260px] overflow-hidden bg-[#2B5B84] text-white sm:min-h-[300px]">
            <div
              aria-hidden
              className="absolute -right-10 -bottom-14 h-40 w-40 rounded-full border-[14px] border-[#E87A5D]/30 sm:-right-16 sm:-bottom-20 sm:h-56 sm:w-56 sm:border-[18px]"
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={candidate.id}
                initial={false}
                animate={{ opacity: 1 }}
                className="relative flex h-full min-h-[260px] flex-col justify-between p-6 sm:min-h-[300px] sm:p-10"
              >
                <div>
                  <p className="font-display text-[10px] font-medium tracking-[0.22em] text-white/65 uppercase sm:text-[11px]">
                    {candidate.yearsExperience}+ years · {candidate.locationMode}
                  </p>
                  <h3 className="mt-2 font-display text-xl font-semibold tracking-tight sm:mt-3 sm:text-2xl md:text-3xl">
                    {candidate.anonymousTitle}
                  </h3>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/90 sm:mt-4 sm:text-base md:text-lg">
                    {candidate.tagline}
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-2 sm:mt-10">
                  {candidate.skills.map((skill) => (
                    <span
                      key={skill}
                      className="border border-white/25 px-2.5 py-1 font-display text-[10px] font-medium tracking-[0.12em] text-white uppercase sm:text-[11px]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-col gap-3">
            <OverlapRow
              icon={<Globe2 className="size-4" />}
              label="Timezone"
              value={`${candidate.timezoneLabel} · ${candidate.timezone}`}
            />
            <OverlapRow
              icon={<Clock className="size-4" />}
              label="Working hours"
              value={candidate.workHours}
            />
            <OverlapRow
              icon={<Layers className="size-4" />}
              label="Overlap"
              value={candidate.overlapBadge}
              accent
            />

            <div className="mt-4 flex gap-2 sm:mt-5">
              {FEATURED_CANDIDATES.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show candidate ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 flex-1 transition sm:h-1 ${
                    i === index ? "bg-[#E87A5D]" : "bg-[#2B5B84]/15"
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

function OverlapRow({
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
      className={`flex items-start gap-3 border-l-2 py-3 pl-4 ${
        accent
          ? "border-[#E87A5D] bg-[#E87A5D]/08"
          : "border-[#2B5B84]/25 bg-[#F7F6F3]"
      }`}
    >
      <span className={accent ? "text-[#E87A5D]" : "text-[#2B5B84]"}>{icon}</span>
      <div>
        <p className="font-display text-[10px] font-semibold tracking-[0.22em] text-[#5B616B] uppercase">
          {label}
        </p>
        <p className="mt-1 text-sm font-medium text-[#2A2D34]">{value}</p>
      </div>
    </div>
  );
}
