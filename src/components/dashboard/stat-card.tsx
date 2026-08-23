"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Sparkline } from "@/components/dashboard/sparkline";
import type { SparkPoint } from "@/lib/dashboard/admin-metrics";
import { cn } from "@/lib/utils";

function ChangeBadge({
  changePct,
  changeLabel,
}: {
  changePct: number;
  changeLabel: string;
}) {
  const rounded = Math.round(changePct * 10) / 10;
  const flat = Math.abs(rounded) < 0.05;
  const up = rounded > 0;

  return (
    <span
      className={cn(
        "inline-flex min-h-11 items-center gap-1 rounded-md px-2.5 text-sm font-semibold tabular-nums",
        flat && "bg-[#2B5B84]/8 text-[#5B616B]",
        !flat && up && "bg-[#2F6F4E]/12 text-[#2F6F4E]",
        !flat && !up && "bg-[#C44B3C]/12 text-[#C44B3C]"
      )}
    >
      {flat ? (
        <Minus className="size-4" aria-hidden />
      ) : up ? (
        <ArrowUpRight className="size-4" aria-hidden />
      ) : (
        <ArrowDownRight className="size-4" aria-hidden />
      )}
      {flat
        ? `0% ${changeLabel}`
        : `${up ? "+" : ""}${rounded}% ${changeLabel}`}
    </span>
  );
}

export function StatCard({
  label,
  value,
  subtitle,
  changePct,
  changeLabel,
  sparkline,
  footer,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  changePct?: number;
  changeLabel?: string;
  sparkline?: SparkPoint[];
  footer?: React.ReactNode;
}) {
  return (
    <article className="flex min-h-[168px] min-w-0 flex-col justify-between border border-[#2B5B84]/12 bg-white p-4 sm:p-5">
      <div>
        <p className="font-display text-[11px] font-semibold tracking-[0.18em] text-[#5B616B] uppercase">
          {label}
        </p>
        <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#2A2D34] tabular-nums sm:text-4xl">
          {value}
        </p>
        {subtitle ? (
          <p className="mt-2 text-sm text-[#5B616B]">{subtitle}</p>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {typeof changePct === "number" ? (
          <ChangeBadge
            changePct={changePct}
            changeLabel={changeLabel ?? "vs prior period"}
          />
        ) : null}
        {sparkline ? <Sparkline data={sparkline} /> : null}
        {footer}
      </div>
    </article>
  );
}
