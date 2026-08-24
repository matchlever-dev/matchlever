"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { ADMIN_LINKS } from "@/lib/admin/admin-nav";
import { cn } from "@/lib/utils";

export function AdminPortalShell({
  title,
  children,
  headerActions,
  mainClassName,
}: {
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  mainClassName?: string;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
                  {title}
                </h1>
              </div>
            </div>
            {headerActions}
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

        <main
          className={cn(
            "mx-auto w-full max-w-6xl flex-1 overflow-x-hidden px-4 py-6 pb-24 sm:px-6 lg:pb-8",
            mainClassName
          )}
        >
          {children}
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
