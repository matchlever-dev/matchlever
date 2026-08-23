"use client";

import { useCallback, useEffect, useState } from "react";
import { Menu, RefreshCw, X } from "lucide-react";
import Link from "next/link";

import { DateRangeToggle } from "@/components/dashboard/date-range-toggle";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { SystemAlerts } from "@/components/dashboard/system-alerts";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { ADMIN_LINKS } from "@/lib/admin/admin-nav";
import {
  buildAdminDashboardSnapshot,
  type DateRangeKey,
  type MetricSection,
} from "@/lib/dashboard/admin-metrics";
import { cn } from "@/lib/utils";

const SECTIONS: MetricSection[] = [
  "users",
  "health",
  "conversions",
  "revenue",
];

const POLL_MS = 45_000;

export function AdminOpsDashboard() {
  const [range, setRange] = useState<DateRangeKey>("today");
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());

  const snapshot = buildAdminDashboardSnapshot(range, refreshToken);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 450));
    setRefreshToken((n) => n + 1);
    setLastRefreshed(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRefreshToken((n) => n + 1);
      setLastRefreshed(new Date());
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

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
                className="inline-flex size-11 items-center justify-center rounded-md text-[#2B5B84] hover:bg-[#2B5B84]/8 lg:hidden"
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
              <div className="min-w-0 lg:hidden">
                <BrandMark className="h-7 w-auto" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-[10px] font-semibold tracking-[0.2em] text-[#E87A5D] uppercase">
                  Admin Portal
                </p>
                <h1 className="truncate font-display text-lg font-semibold text-[#2B5B84] sm:text-xl">
                  Operations dashboard
                </h1>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <DateRangeToggle
                value={range}
                onChange={setRange}
                disabled={refreshing}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void refresh()}
                disabled={refreshing}
                className="min-h-11 gap-2 border-[#2B5B84]/20 text-[#2B5B84]"
              >
                <RefreshCw
                  className={cn("size-4", refreshing && "animate-spin")}
                  aria-hidden
                />
                Refresh
              </Button>
            </div>
          </div>
          <p className="border-t border-[#2B5B84]/08 px-4 py-2 text-xs text-[#5B616B] sm:px-6">
            Mock live feed · auto-polls every 45s · updated{" "}
            <time dateTime={lastRefreshed.toISOString()}>
              {lastRefreshed.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </time>
          </p>
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

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 overflow-x-hidden px-4 py-6 pb-24 sm:px-6 lg:pb-8">
          <SystemAlerts alerts={snapshot.alerts} />
          {SECTIONS.map((section) => (
            <MetricGrid
              key={section}
              section={section}
              metrics={snapshot.metrics}
            />
          ))}
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
