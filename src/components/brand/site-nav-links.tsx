"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useNavSession } from "@/components/brand/nav-session-provider";
import type { NavSession } from "@/lib/auth/nav-session";
import { cn } from "@/lib/utils";

export const PUBLIC_NAV_LINKS = [
  { href: "/why-matchlever", label: "Why MatchLever" },
  { href: "/legal/talent", label: "Talent Terms" },
  { href: "/contact", label: "Contact Us" },
] as const;

export type SiteNavItem = {
  key: string;
  href: string;
  label: string;
  emphasis: "primary" | "default" | "staff";
  kind: "link" | "sign-in";
};

export function siteNavLinkClassName(emphasis: SiteNavItem["emphasis"]) {
  if (emphasis === "primary") {
    return "font-semibold text-[#2B5B84] underline-offset-2 transition hover:text-[#E87A5D] hover:underline";
  }
  if (emphasis === "staff") {
    return "font-semibold text-[#E87A5D] underline-offset-2 transition hover:text-[#2B5B84] hover:underline";
  }
  return "text-[#5B616B] transition hover:text-[#2B5B84]";
}

export function buildSiteNavItems(
  session: NavSession,
  ready: boolean,
  pathname?: string | null
): SiteNavItem[] {
  const items: SiteNavItem[] = PUBLIC_NAV_LINKS.map((link) => ({
    key: link.href,
    href: link.href,
    label: link.label,
    emphasis: link.href === "/why-matchlever" ? "primary" : "default",
    kind: "link" as const,
  }));

  const pathDashboardHref = resolvePathDashboardHref(pathname);
  const dashboardHref = session.dashboardHref ?? pathDashboardHref;
  const isAuthenticated =
    session.authenticated || Boolean(pathDashboardHref);

  if (isAuthenticated && dashboardHref) {
    items.push({
      key: "dashboard",
      href: dashboardHref,
      label: session.dashboardLabel,
      emphasis: "primary",
      kind: "link",
    });
  } else if (ready) {
    items.push({
      key: "sign-in",
      href: "/login",
      label: "Sign In",
      emphasis: "primary",
      kind: "sign-in",
    });
  }

  if (ready && session.staffLinks.length > 0) {
    for (const staffLink of session.staffLinks) {
      items.push({
        key: staffLink.href,
        href: staffLink.href,
        label: staffLink.label,
        emphasis: "staff",
        kind: "link",
      });
    }
  }

  return items;
}

function resolvePathDashboardHref(pathname?: string | null): string | null {
  if (!pathname) return null;
  if (pathname.startsWith("/dashboard/talent")) return "/dashboard/talent";
  if (pathname.startsWith("/dashboard/employer")) return "/dashboard/employer";
  if (pathname.startsWith("/admin")) return "/admin/dashboard";
  if (pathname.startsWith("/superuser")) return "/superuser/talent";
  return null;
}

export function SiteNavLinks({
  className,
  linkClassName,
}: {
  className?: string;
  linkClassName?: string;
}) {
  const pathname = usePathname();
  const { session, ready } = useNavSession();
  const items = buildSiteNavItems(session, ready, pathname);

  return (
    <nav
      aria-label="Site"
      className={cn(
        "flex flex-wrap items-center gap-x-6 gap-y-2 text-sm",
        className
      )}
    >
      {items.map((item) =>
        item.kind === "sign-in" ? (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-md bg-[#2B5B84] px-4 font-display text-xs font-semibold tracking-[0.12em] text-white uppercase transition hover:bg-[#244e71]",
              linkClassName
            )}
          >
            {item.label}
          </Link>
        ) : (
          <Link
            key={item.key}
            href={item.href}
            className={cn(siteNavLinkClassName(item.emphasis), linkClassName)}
          >
            {item.label}
          </Link>
        )
      )}
    </nav>
  );
}
