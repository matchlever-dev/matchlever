"use client";

import { NavSessionProvider } from "@/components/brand/nav-session-provider";
import { SiteHeader } from "@/components/brand/site-header";
import type { NavSession } from "@/lib/auth/nav-session";

export function SiteChrome({
  initialSession,
  children,
}: {
  initialSession: NavSession;
  children: React.ReactNode;
}) {
  return (
    <NavSessionProvider initialSession={initialSession}>
      <SiteHeader />
      {children}
    </NavSessionProvider>
  );
}
