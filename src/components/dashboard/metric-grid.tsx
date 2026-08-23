"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import {
  SECTION_META,
  type MetricSection,
  type StatMetric,
} from "@/lib/dashboard/admin-metrics";

export function MetricGrid({
  section,
  metrics,
}: {
  section: MetricSection;
  metrics: StatMetric[];
}) {
  const meta = SECTION_META[section];
  const rows = metrics.filter((m) => m.section === section);
  if (!rows.length) return null;

  return (
    <section aria-labelledby={`section-${section}`} className="space-y-3">
      <div>
        <h2
          id={`section-${section}`}
          className="font-display text-sm font-semibold tracking-wide text-[#2B5B84] uppercase"
        >
          {meta.title}
        </h2>
        <p className="mt-1 text-sm text-[#5B616B]">{meta.description}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {rows.map((metric) => (
          <StatCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
}
