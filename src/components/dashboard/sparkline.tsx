"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

import type { HealthStatus, SparkPoint } from "@/lib/dashboard/admin-metrics";
import { cn } from "@/lib/utils";

const STROKE: Record<HealthStatus, string> = {
  healthy: "#2F6F4E",
  watch: "#C4922A",
  critical: "#C44B3C",
};

export function Sparkline({
  data,
  health,
  className,
}: {
  data: SparkPoint[];
  health: HealthStatus;
  className?: string;
}) {
  const color = STROKE[health];
  const gradientId = `spark-${health}-${data.length}`;

  return (
    <div className={cn("h-10 w-full min-w-0", className)} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
