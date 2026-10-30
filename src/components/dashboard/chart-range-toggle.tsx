"use client";

import {
  CHART_RANGE_OPTIONS,
  type ChartRangeKey,
} from "@/lib/dashboard/admin-metrics";
import { cn } from "@/lib/utils";

export function ChartRangeToggle({
  value,
  onChange,
}: {
  value: ChartRangeKey;
  onChange: (next: ChartRangeKey) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Chart range"
      className="flex w-full min-w-0 flex-wrap gap-1 rounded-lg border border-[#2B5B84]/15 bg-white p-1 sm:w-auto sm:flex-nowrap"
    >
      {CHART_RANGE_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            title={option.label}
            className={cn(
              "min-h-11 min-w-11 flex-1 rounded-md px-2.5 font-display text-[11px] font-semibold tracking-wide uppercase transition-colors sm:flex-none sm:px-3",
              active
                ? "bg-[#2B5B84] text-white"
                : "text-[#2B5B84] hover:bg-[#2B5B84]/8"
            )}
          >
            <span className="sm:hidden">{option.shortLabel}</span>
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
