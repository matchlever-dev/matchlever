"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { ChartRangeToggle } from "@/components/dashboard/chart-range-toggle";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import type {
  AdminDashboardData,
  ChartRangeKey,
} from "@/lib/dashboard/admin-metrics";

function ProgressTowardTarget({
  current,
  target,
  targetLabel,
}: {
  current: number;
  target: number;
  targetLabel: string;
}) {
  const pct = Math.min(100, Math.round((current / Math.max(target, 1)) * 100));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs text-[#5B616B]">
        <span>
          {current.toLocaleString()} / {target.toLocaleString()} {targetLabel}
        </span>
        <span className="font-semibold tabular-nums text-[#2B5B84]">{pct}%</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-[#2B5B84]/12"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${targetLabel} progress`}
      >
        <div
          className="h-full rounded-full bg-[#2B5B84] transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5"
      aria-busy="true"
      aria-label="Loading dashboard metrics"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="min-h-[168px] border border-[#2B5B84]/12 bg-white p-4 sm:p-5"
        >
          <div className="h-3 w-28 animate-pulse rounded bg-[#2B5B84]/12" />
          <div className="mt-4 h-9 w-20 animate-pulse rounded bg-[#2B5B84]/10" />
          <div className="mt-3 h-3 w-48 animate-pulse rounded bg-[#2B5B84]/8" />
          <div className="mt-6 h-10 w-full animate-pulse rounded bg-[#2B5B84]/8" />
        </div>
      ))}
    </div>
  );
}

export function AdminOpsDashboard() {
  const [range, setRange] = useState<ChartRangeKey>("30d");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextRange: ChartRangeKey) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/dashboard?range=${encodeURIComponent(nextRange)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load dashboard metrics");
      }
      setData(json as AdminDashboardData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard metrics"
      );
      // Keep any previously loaded real metrics; never inject mock fallback data.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [load, range]);

  return (
    <AdminPortalShell
      title="Dashboard"
      headerActions={<ChartRangeToggle value={range} onChange={setRange} />}
      mainClassName="max-w-5xl"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#5B616B]">
          {data
            ? `${data.visitorVolume.periodLabel} snapshot for MatchLever traffic, signups, pipeline, and matches.${data.demo ? " (Demo data)" : ""}`
            : "Loading MatchLever traffic, signups, pipeline, and matches."}
        </p>
        {loading && data ? (
          <p className="text-xs font-medium text-[#5B616B]">Refreshing…</p>
        ) : null}
      </div>

      {error ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading && !data ? <DashboardSkeleton /> : null}

      {data ? (
        <div
          className={
            loading
              ? "grid grid-cols-1 gap-4 opacity-60 lg:grid-cols-2 lg:gap-5"
              : "grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5"
          }
        >
          <StatCard
            label={data.visitorVolume.label}
            value={data.visitorVolume.total.toLocaleString()}
            subtitle={
              data.visitorVolume.unavailableReason
                ? data.visitorVolume.unavailableReason
                : `Total site views · ${data.visitorVolume.periodLabel.toLowerCase()}`
            }
            sparkline={data.visitorVolume.sparkline}
          />

          <StatCard
            label={data.newRegistrations.label}
            value={data.newRegistrations.total.toLocaleString()}
            subtitle={`${data.newRegistrations.talent.toLocaleString()} talent · ${data.newRegistrations.employers.toLocaleString()} employers · ${data.newRegistrations.periodLabel.toLowerCase()}`}
            changePct={data.newRegistrations.changePct}
            changeLabel={data.newRegistrations.changeLabel}
          />

          <PipelineChart metric={data.talentPipeline} />

          <StatCard
            label={data.activeMatches.label}
            value={data.activeMatches.matchesInPeriod.toLocaleString()}
            subtitle={`Introductions · ${data.activeMatches.periodLabel.toLowerCase()}`}
            footer={
              <ProgressTowardTarget
                current={data.activeMatches.periodProgress}
                target={data.activeMatches.periodTarget}
                targetLabel={data.activeMatches.targetLabel}
              />
            }
          />
        </div>
      ) : null}

      {!loading && !data && !error ? (
        <p className="text-sm text-[#5B616B]">No dashboard metrics available.</p>
      ) : null}
    </AdminPortalShell>
  );
}
