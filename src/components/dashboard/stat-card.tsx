"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Sparkline } from "@/components/dashboard/sparkline";
import { Badge } from "@/components/ui/badge";
import type { HealthStatus, StatMetric } from "@/lib/dashboard/admin-metrics";
import { cn } from "@/lib/utils";

const HEALTH_STYLES: Record<
  HealthStatus,
  { ring: string; badge: string; label: string }
> = {
  healthy: {
    ring: "border-l-[#2F6F4E]",
    badge: "bg-[#2F6F4E]/12 text-[#2F6F4E]",
    label: "Healthy",
  },
  watch: {
    ring: "border-l-[#C4922A]",
    badge: "bg-[#C4922A]/15 text-[#8A6418]",
    label: "Watch",
  },
  critical: {
    ring: "border-l-[#C44B3C]",
    badge: "bg-[#C44B3C]/12 text-[#C44B3C]",
    label: "Alert",
  },
};

function DeltaBadge({ deltaPct }: { deltaPct: number }) {
  const rounded = Math.round(deltaPct * 10) / 10;
  const flat = Math.abs(rounded) < 0.05;
  const up = rounded > 0;

  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-0.5 rounded-md px-2 text-xs font-semibold tabular-nums",
        flat && "bg-[#2B5B84]/8 text-[#5B616B]",
        !flat && up && "bg-[#2F6F4E]/12 text-[#2F6F4E]",
        !flat && !up && "bg-[#C44B3C]/12 text-[#C44B3C]"
      )}
    >
      {flat ? (
        <Minus className="size-3.5" aria-hidden />
      ) : up ? (
        <ArrowUpRight className="size-3.5" aria-hidden />
      ) : (
        <ArrowDownRight className="size-3.5" aria-hidden />
      )}
      {flat ? "0%" : `${up ? "+" : ""}${rounded}%`}
    </span>
  );
}

export function StatCard({ metric }: { metric: StatMetric }) {
  const health = HEALTH_STYLES[metric.health];

  return (
    <article
      className={cn(
        "flex min-h-[148px] flex-col justify-between border border-[#2B5B84]/12 border-l-4 bg-white p-4 shadow-[0_1px_0_rgba(42,45,52,0.04)]",
        health.ring
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[10px] font-semibold tracking-[0.18em] text-[#5B616B] uppercase">
            {metric.label}
          </p>
          <p className="mt-2 flex items-baseline gap-1 font-display text-2xl font-semibold tracking-tight text-[#2A2D34] tabular-nums sm:text-[1.65rem]">
            <span>{metric.value}</span>
            {metric.unit ? (
              <span className="text-sm font-medium text-[#5B616B]">
                {metric.unit}
              </span>
            ) : null}
          </p>
          {metric.subtitle ? (
            <p className="mt-1 text-xs text-[#5B616B]">{metric.subtitle}</p>
          ) : null}
        </div>
        <Badge
          variant="secondary"
          className={cn("shrink-0 rounded-md border-0", health.badge)}
        >
          {health.label}
        </Badge>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <DeltaBadge deltaPct={metric.deltaPct} />
        <div className="w-[42%] max-w-[140px] min-w-[72px]">
          <Sparkline data={metric.sparkline} health={metric.health} />
        </div>
      </div>
    </article>
  );
}
