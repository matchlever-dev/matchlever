"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CandidatePipelineMetric } from "@/lib/dashboard/admin-metrics";

type ChartRow = {
  name: string;
  Draft: number;
  "Pending Review": number;
  Active: number;
  Placed: number;
};

export function PipelineChart({
  metric,
}: {
  metric: CandidatePipelineMetric;
}) {
  const row: ChartRow = {
    name: "Candidates",
    Draft: 0,
    "Pending Review": 0,
    Active: 0,
    Placed: 0,
  };
  for (const segment of metric.segments) {
    row[segment.status] = segment.count;
  }

  const data = [row];
  const colorByStatus = Object.fromEntries(
    metric.segments.map((s) => [s.status, s.color])
  ) as Record<keyof Omit<ChartRow, "name">, string>;

  return (
    <article className="flex min-h-[168px] min-w-0 flex-col border border-[#2B5B84]/12 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-[11px] font-semibold tracking-[0.18em] text-[#5B616B] uppercase">
            {metric.label}
          </p>
          <p className="mt-2 text-sm text-[#5B616B]">
            {metric.total} candidates · {metric.periodLabel.toLowerCase()}
          </p>
        </div>
      </div>

      <div className="mt-4 w-full min-w-0 overflow-hidden">
        <div className="h-20 w-full min-w-0 sm:h-24">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              barSize={28}
            >
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <YAxis type="category" dataKey="name" hide width={0} />
              <Tooltip
                cursor={{ fill: "rgba(43,91,132,0.06)" }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid rgba(43,91,132,0.15)",
                  fontSize: 12,
                }}
              />
              {(
                [
                  "Draft",
                  "Pending Review",
                  "Active",
                  "Placed",
                ] as const
              ).map((status) => (
                <Bar
                  key={status}
                  dataKey={status}
                  stackId="pipeline"
                  fill={colorByStatus[status]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metric.segments.map((segment) => (
          <li key={segment.status} className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: segment.color }}
                aria-hidden
              />
              <span className="truncate text-xs text-[#5B616B]">
                {segment.status}
              </span>
            </div>
            <p className="mt-1 pl-[18px] font-display text-sm font-semibold text-[#2A2D34] tabular-nums">
              {segment.count}
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}
