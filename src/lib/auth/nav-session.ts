import type { UserRoleContext } from "@/lib/auth/roles";

export type NavStaffLink = {
  href: string;
  label: string;
};

export type NavSession = {
  authenticated: boolean;
  dashboardHref: string | null;
  dashboardLabel: string;
  staffLink: NavStaffLink | null;
};

export const GUEST_NAV_SESSION: NavSession = {
  authenticated: false,
  dashboardHref: null,
  dashboardLabel: "Dashboard",
  staffLink: null,
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

export function resolveStaffNavLink(
  ctx: Pick<UserRoleContext, "isAdmin" | "isSuperuser"> | null
): NavStaffLink | null {
  if (!ctx) return null;
  if (ctx.isSuperuser) {
    return { href: "/superuser/talent", label: "Superuser Console" };
  }
  if (ctx.isAdmin) {
    return { href: "/admin/dashboard", label: "Admin Portal" };
  }
  return null;
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
    staffLink: resolveStaffNavLink(ctx),
  };
}
