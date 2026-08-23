"use client";

import { AlertTriangle, Bell, Info, ShieldAlert } from "lucide-react";

import type { SystemAlert } from "@/lib/dashboard/admin-metrics";
import { cn } from "@/lib/utils";

const SEVERITY = {
  info: {
    icon: Info,
    bar: "border-l-[#2B5B84]",
    iconColor: "text-[#2B5B84]",
    chip: "bg-[#2B5B84]/10 text-[#2B5B84]",
  },
  warning: {
    icon: AlertTriangle,
    bar: "border-l-[#C4922A]",
    iconColor: "text-[#C4922A]",
    chip: "bg-[#C4922A]/15 text-[#8A6418]",
  },
  critical: {
    icon: ShieldAlert,
    bar: "border-l-[#C44B3C]",
    iconColor: "text-[#C44B3C]",
    chip: "bg-[#C44B3C]/12 text-[#C44B3C]",
  },
} as const;

export function SystemAlerts({ alerts }: { alerts: SystemAlert[] }) {
  return (
    <section
      aria-labelledby="system-alerts-heading"
      className="border border-[#2B5B84]/12 bg-white"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#2B5B84]/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-[#E87A5D]" aria-hidden />
          <h2
            id="system-alerts-heading"
            className="font-display text-sm font-semibold tracking-wide text-[#2B5B84] uppercase"
          >
            System alerts
          </h2>
        </div>
        <span className="rounded-md bg-[#E87A5D]/12 px-2 py-1 text-xs font-semibold text-[#E87A5D] tabular-nums">
          {alerts.length}
        </span>
      </div>
      <ul className="divide-y divide-[#2B5B84]/8">
        {alerts.map((alert) => {
          const tone = SEVERITY[alert.severity];
          const Icon = tone.icon;
          return (
            <li
              key={alert.id}
              className={cn("flex gap-3 border-l-4 px-4 py-3", tone.bar)}
            >
              <Icon
                className={cn("mt-0.5 size-4 shrink-0", tone.iconColor)}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[#2A2D34]">
                    {alert.title}
                  </p>
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                      tone.chip
                    )}
                  >
                    {alert.severity}
                  </span>
                  {typeof alert.count === "number" ? (
                    <span className="text-xs font-semibold text-[#5B616B] tabular-nums">
                      ×{alert.count}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#5B616B]">{alert.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
