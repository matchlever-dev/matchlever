"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { ChartRangeToggle } from "@/components/dashboard/chart-range-toggle";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { ADMIN_LINKS } from "@/lib/admin/admin-nav";
import {
  getAdminDashboardMock,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [range, setRange] = useState<ChartRangeKey>("30d");
  const data = getAdminDashboardMock(range);

  return (
    <div className="flex min-h-[100svh] bg-[#F7F6F3] text-[#2A2D34]">
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[#2B5B84]/10 bg-white/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-[#2B5B84] hover:bg-[#2B5B84]/8 lg:hidden"
                aria-label={drawerOpen ? "Close menu" : "Open menu"}
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen((open) => !open)}
              >
                {drawerOpen ? (
                  <X className="size-5" />
                ) : (
                  <Menu className="size-5" />
                )}
              </button>
              <div className="lg:hidden">
                <BrandMark className="h-7 w-auto" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-[10px] font-semibold tracking-[0.2em] text-[#E87A5D] uppercase">
                  Admin Portal
                </p>
                <h1 className="truncate font-display text-lg font-semibold text-[#2B5B84] sm:text-xl">
                  Dashboard
                </h1>
              </div>
            </div>
            <ChartRangeToggle value={range} onChange={setRange} />
          </div>
        </header>

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-[#2A2D34]/40"
              aria-label="Close menu overlay"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[min(100%,288px)] flex-col bg-white shadow-xl">
              <div className="flex h-14 items-center justify-between border-b border-[#2B5B84]/10 px-4">
                <span className="font-display text-xs font-bold tracking-[0.16em] text-[#2B5B84] uppercase">
                  Admin menu
                </span>
                <button
                  type="button"
                  className="inline-flex size-11 items-center justify-center rounded-md text-[#2B5B84] hover:bg-[#2B5B84]/8"
                  aria-label="Close menu"
                  onClick={() => setDrawerOpen(false)}
                >
                  <X className="size-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 p-3" aria-label="Admin drawer">
                {ADMIN_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className="inline-flex min-h-11 items-center rounded-lg px-3 font-display text-xs font-semibold tracking-wide text-[#2B5B84] uppercase hover:bg-[#2B5B84]/8"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/"
                  onClick={() => setDrawerOpen(false)}
                  className="inline-flex min-h-11 items-center rounded-lg px-3 font-display text-xs font-semibold tracking-wide text-[#5B616B] uppercase hover:bg-[#2B5B84]/8"
                >
                  Home
                </Link>
              </nav>
            </div>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-5xl flex-1 overflow-x-hidden px-4 py-6 pb-24 sm:px-6 lg:pb-8">
          <p className="mb-5 text-sm text-[#5B616B]">
            {data.visitorVolume.periodLabel} snapshot for MatchLever traffic,
            signups, pipeline, and matches.
          </p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            <StatCard
              label={data.visitorVolume.label}
              value={data.visitorVolume.total.toLocaleString()}
              subtitle={`Total site views · ${data.visitorVolume.periodLabel.toLowerCase()}`}
              sparkline={data.visitorVolume.sparkline}
            />

            <StatCard
              label={data.newRegistrations.label}
              value={data.newRegistrations.total.toLocaleString()}
              subtitle={`${data.newRegistrations.candidates.toLocaleString()} candidates · ${data.newRegistrations.employers.toLocaleString()} employers · ${data.newRegistrations.periodLabel.toLowerCase()}`}
              changePct={data.newRegistrations.changePct}
              changeLabel={data.newRegistrations.changeLabel}
            />

            <PipelineChart metric={data.candidatePipeline} />

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
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
