"use client";

import {
  DATE_RANGE_OPTIONS,
  type DateRangeKey,
} from "@/lib/dashboard/admin-metrics";
import { cn } from "@/lib/utils";

export function DateRangeToggle({
  value,
  onChange,
  disabled,
}: {
  value: DateRangeKey;
  onChange: (next: DateRangeKey) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex rounded-lg border border-[#2B5B84]/15 bg-white p-1"
    >
      {DATE_RANGE_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 min-w-11 rounded-md px-3 font-display text-xs font-semibold tracking-wide uppercase transition-colors",
              active
                ? "bg-[#2B5B84] text-white"
                : "text-[#2B5B84] hover:bg-[#2B5B84]/8",
              disabled && "opacity-60"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
