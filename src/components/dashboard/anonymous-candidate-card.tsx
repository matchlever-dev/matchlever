"use client";

import { EyeOff } from "lucide-react";

import type { SeekerDashboardData } from "@/lib/dashboard/seeker";

export function AnonymousCandidateCard({
  data,
}: {
  data: SeekerDashboardData;
}) {
  const verifiedCount = data.references.filter((r) => r.status === "verified")
    .length;
  const total = Math.max(data.references.length, 1);

  return (
    <article className="relative overflow-hidden border border-[#2B5B84]/15 bg-white">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2B5B84] to-[#E87A5D]"
      />
      {data.status === "on_hold" && (
        <div className="flex items-center gap-2 border-b border-[#E87A5D]/25 bg-[#E87A5D]/10 px-5 py-3 text-sm text-[#2A2D34]">
          <EyeOff className="size-4 text-[#E87A5D]" />
          <span>
            <strong className="font-semibold text-[#E87A5D]">On Hold</strong> —
            your profile is hidden from all employer searches.
          </span>
        </div>
      )}

      <div className="p-6 sm:p-8">
        <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#5B616B] uppercase">
          Employer view
        </p>

        <div className="mt-5 flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#2B5B84] font-display text-xl font-bold text-white">
            {data.initials}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold tracking-tight text-[#2A2D34] sm:text-2xl">
              {data.headline}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#2B5B84] sm:text-base">
              {data.selectedTagline}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <p className="font-display text-[10px] font-semibold tracking-[0.2em] text-[#5B616B] uppercase">
            Verified skills
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.verifiedSkills.length > 0 ? (
              data.verifiedSkills.map((skill) => (
                <span
                  key={skill}
                  className="border border-[#2B5B84]/20 bg-[#F7F6F3] px-2.5 py-1 text-xs font-medium text-[#2B5B84]"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-sm text-[#5B616B]">No skills listed yet</span>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="border-l-2 border-[#2B5B84]/25 bg-[#F7F6F3] py-3 pl-4">
            <p className="font-display text-[10px] font-semibold tracking-[0.2em] text-[#5B616B] uppercase">
              Global location
            </p>
            <p className="mt-1 text-sm font-medium text-[#2A2D34]">
              {data.globalCity}, {data.globalCountry}
            </p>
          </div>
          <div className="border-l-2 border-[#E87A5D]/40 bg-[#E87A5D]/08 py-3 pl-4">
            <p className="font-display text-[10px] font-semibold tracking-[0.2em] text-[#5B616B] uppercase">
              Timezone
            </p>
            <p className="mt-1 text-sm font-medium text-[#2A2D34]">
              {data.timezoneLabel}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#2B5B84]/10 pt-5">
          <div>
            <p className="font-display text-[10px] font-semibold tracking-[0.2em] text-[#5B616B] uppercase">
              Reference tracker
            </p>
            <p className="mt-1 text-sm font-medium text-[#2A2D34]">
              {verifiedCount} of {data.references.length || 3} complete
            </p>
          </div>
          <div className="h-2 w-28 overflow-hidden rounded-full bg-[#2B5B84]/15">
            <div
              className="h-full bg-[#E87A5D] transition-all"
              style={{
                width: `${Math.round((verifiedCount / total) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
