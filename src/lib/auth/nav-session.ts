import type { UserRoleContext } from "@/lib/auth/roles";

export type NavStaffLink = {
  href: string;
  label: string;
};

export type NavSession = {
  authenticated: boolean;
  dashboardHref: string | null;
  dashboardLabel: string;
  hasTalentProfile: boolean;
  hasEmployerProfile: boolean;
  staffLinks: NavStaffLink[];
};

export const GUEST_NAV_SESSION: NavSession = {
  authenticated: false,
  dashboardHref: null,
  dashboardLabel: "Dashboard",
  hasTalentProfile: false,
  hasEmployerProfile: false,
  staffLinks: [],
};

/**
 * Default landing dashboard after login / nav "Dashboard" link.
 * Dual-profile users prefer Employer; single-profile users get their profile.
 */
export function resolveDashboardNav(ctx: UserRoleContext | null): {
  href: string;
  label: string;
} {
  if (!ctx) {
    return { href: "/onboarding", label: "Dashboard" };
  }
  if (ctx.hasEmployerProfile) {
    return { href: "/dashboard/employer", label: "Dashboard" };
  }
  if (ctx.hasTalentProfile) {
    return { href: "/dashboard/talent", label: "Dashboard" };
  }
  return { href: "/onboarding", label: "Dashboard" };
}

export function resolveStaffNavLinks(
  ctx: Pick<UserRoleContext, "isAdmin" | "isSuperuser"> | null
): NavStaffLink[] {
  if (!ctx) return [];

  const links: NavStaffLink[] = [];
  if (ctx.isAdmin) {
    links.push({ href: "/admin/dashboard", label: "Admin" });
  }
  if (ctx.isSuperuser) {
    links.push({ href: "/superuser/talent", label: "Superuser" });
  }
  return links;
}

export function buildNavSession(
  ctx: UserRoleContext | null,
  authenticated: boolean
): NavSession {
  if (!authenticated) {
    return GUEST_NAV_SESSION;
  }

  const dashboard = resolveDashboardNav(ctx);

  return {
    authenticated: true,
    dashboardHref: dashboard.href,
    dashboardLabel: dashboard.label,
    hasTalentProfile: Boolean(ctx?.hasTalentProfile),
    hasEmployerProfile: Boolean(ctx?.hasEmployerProfile),
    staffLinks: resolveStaffNavLinks(ctx),
  };
}
