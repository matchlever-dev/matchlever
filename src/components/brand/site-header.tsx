"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { useNavSession } from "@/components/brand/nav-session-provider";
import {
  buildSiteNavItems,
  siteNavLinkClassName,
} from "@/components/brand/site-nav-links";
import { cn } from "@/lib/utils";

const HIDDEN_PREFIXES = [
  "/admin",
  "/superuser",
  "/dashboard",
  "/onboarding",
  "/login",
  "/reference",
  "/auth",
  "/choose-role",
] as const;

export function shouldShowSiteHeader(pathname: string) {
  return !HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function SiteHeader({ className }: { className?: string }) {
  const pathname = usePathname();
  const { session, ready } = useNavSession();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!shouldShowSiteHeader(pathname)) {
    return null;
  }

  const navItems = buildSiteNavItems(session, ready, pathname);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-[#2B5B84]/10 bg-white/95 backdrop-blur",
          className
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-[#2B5B84] hover:bg-[#2B5B84]/8 md:hidden"
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
            <Link href="/" className="flex min-w-0 items-center gap-2">
              <BrandMark className="h-7 w-auto shrink-0" />
              <span className="hidden font-display text-xs font-bold tracking-[0.16em] text-[#2B5B84] uppercase sm:inline">
                MatchLever
              </span>
            </Link>
          </div>

          <nav
            aria-label="Site"
            className="hidden flex-wrap items-center gap-x-5 gap-y-2 md:flex"
          >
            {navItems.map((item) =>
              item.kind === "sign-in" ? (
                <Link
                  key={item.key}
                  href={item.href}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-[#2B5B84] px-4 font-display text-xs font-semibold tracking-[0.12em] text-white uppercase transition hover:bg-[#244e71]"
                >
                  {item.label}
                </Link>
              ) : (
                <Link
                  key={item.key}
                  href={item.href}
                  className={siteNavLinkClassName(item.emphasis)}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
        </div>
      </header>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#2A2D34]/40"
            aria-label="Close menu overlay"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,288px)] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-[#2B5B84]/10 px-4">
              <span className="font-display text-xs font-bold tracking-[0.16em] text-[#2B5B84] uppercase">
                Menu
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
            <nav
              className="flex flex-col gap-1 p-3"
              aria-label="Mobile site menu"
            >
              {navItems.map((item) =>
                item.kind === "sign-in" ? (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#2B5B84] px-3 font-display text-xs font-semibold tracking-[0.12em] text-white uppercase hover:bg-[#244e71]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-lg px-3 font-display text-xs font-semibold tracking-wide uppercase",
                      item.emphasis === "staff"
                        ? "text-[#E87A5D] hover:bg-[#E87A5D]/10"
                        : item.emphasis === "primary"
                          ? "text-[#2B5B84] hover:bg-[#2B5B84]/8"
                          : "text-[#5B616B] hover:bg-[#2B5B84]/8"
                    )}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
