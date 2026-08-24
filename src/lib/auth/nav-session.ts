import type { UserRoleContext } from "@/lib/auth/roles";

export type NavStaffLink = {
  href: string;
  label: string;
};

export type NavSession = {
  authenticated: boolean;
  dashboardHref: string | null;
  dashboardLabel: string;
  staffLinks: NavStaffLink[];
};

export const GUEST_NAV_SESSION: NavSession = {
  authenticated: false,
  dashboardHref: null,
  dashboardLabel: "Dashboard",
  staffLinks: [],
};

export function resolveDashboardNav(ctx: UserRoleContext | null): {
  href: string;
  label: string;
} {
  if (!ctx) {
    return { href: "/onboarding", label: "Dashboard" };
  }
  if (ctx.hasTalentProfile && ctx.hasEmployerProfile) {
    return { href: "/choose-role", label: "Dashboard" };
  }
  if (ctx.hasTalentProfile) {
    return { href: "/dashboard/talent", label: "Dashboard" };
  }
  if (ctx.hasEmployerProfile) {
    return { href: "/dashboard/employer", label: "Dashboard" };
  }
  return { href: "/onboarding", label: "Dashboard" };
}

export function resolveStaffNavLinks(
  ctx: Pick<UserRoleContext, "isAdmin" | "isSuperuser"> | null
): NavStaffLink[] {
  if (!ctx) return [];

  const links: NavStaffLink[] = [];
  if (ctx.isAdmin) {
    links.push({ href: "/admin/dashboard", label: "Admin Portal" });
  }
  if (ctx.isSuperuser) {
    links.push({ href: "/superuser/talent", label: "Superuser Console" });
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
    staffLinks: resolveStaffNavLinks(ctx),
  };
}
