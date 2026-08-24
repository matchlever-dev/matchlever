"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { ChartRangeToggle } from "@/components/dashboard/chart-range-toggle";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  getAdminDashboardMock,
  type AdminDashboardData,
  type ChartRangeKey,
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

export function AdminOpsDashboard() {
  const [range, setRange] = useState<ChartRangeKey>("30d");
  const [data, setData] = useState<AdminDashboardData>(() =>
    getAdminDashboardMock("30d")
  );
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
      setData(getAdminDashboardMock(nextRange));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [load, range]);

  const visitorSubtitle = data.visitorVolume.unavailableReason
    ? data.visitorVolume.unavailableReason
    : `Total site views · ${data.visitorVolume.periodLabel.toLowerCase()}`;

  return (
    <AdminPortalShell
      title="Dashboard"
      headerActions={<ChartRangeToggle value={range} onChange={setRange} />}
      mainClassName="max-w-5xl"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#5B616B]">
          {data.visitorVolume.periodLabel} snapshot for MatchLever traffic,
          signups, pipeline, and matches.
          {data.demo ? " (Demo data)" : null}
        </p>
        {loading ? (
          <p className="text-xs font-medium text-[#5B616B]">Refreshing…</p>
        ) : null}
      </div>

      {error ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error} Showing fallback metrics.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <StatCard
          label={data.visitorVolume.label}
          value={data.visitorVolume.total.toLocaleString()}
          subtitle={visitorSubtitle}
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
    </AdminPortalShell>
  );
}
