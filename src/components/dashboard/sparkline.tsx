"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

import type { SparkPoint } from "@/lib/dashboard/admin-metrics";
import { cn } from "@/lib/utils";

export function Sparkline({
  data,
  className,
  stroke = "#2B5B84",
}: {
  data: SparkPoint[];
  className?: string;
  stroke?: string;
}) {
  return (
    <div className={cn("h-12 w-full min-w-0", className)} aria-hidden>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="visitorSpark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="views"
            stroke={stroke}
            strokeWidth={2}
            fill="url(#visitorSpark)"
            isAnimationActive={false}
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
