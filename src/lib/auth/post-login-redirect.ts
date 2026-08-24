import type { SupabaseClient } from "@supabase/supabase-js";

import {
  loadUserRoleContext,
} from "@/lib/auth/roles";
import type { Database } from "@/types/database";

/** Only allow same-origin relative paths (open-redirect safe). */
export function sanitizeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  if (next.includes("://")) return null;
  return next;
}

type AppSupabase = SupabaseClient<Database>;

/**
 * Decide where a signed-in user should land.
 * Honors a safe `next` path when the user has access; otherwise lands on the
 * appropriate dashboard or onboarding gateway.
 */
export async function resolvePostLoginPath(
  supabase: AppSupabase,
  preferredNext?: string | null
): Promise<string> {
  const safe = sanitizeNextPath(preferredNext);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/login";

  const ctx = await loadUserRoleContext(supabase, user.id);
  if (!ctx) return "/onboarding";

  if (safe?.startsWith("/superuser") && ctx.isSuperuser) return safe;
  if (safe?.startsWith("/admin") && ctx.isAdmin) return safe;

  if (safe?.startsWith("/employer/waitlist")) return safe;
  if (safe?.startsWith("/choose-role")) return safe;

  if (
    safe &&
    (safe.startsWith("/dashboard") ||
      safe.startsWith("/onboarding") ||
      safe === "/")
  ) {
    if (safe.startsWith("/onboarding") && ctx.hasTalentProfile) {
      return "/dashboard/talent?edit=1";
    }
    if (safe.startsWith("/dashboard/employer") && !ctx.hasEmployerProfile) {
      return "/employer/waitlist";
    }
    if (safe.startsWith("/dashboard/talent") && !ctx.hasTalentProfile) {
      return "/onboarding";
    }
    return safe;
  }

  if (safe?.startsWith("/dashboard/employer")) {
    return ctx.hasEmployerProfile ? safe : "/employer/waitlist";
  }

  // Prefer employer when dual-profile; otherwise land on the single profile.
  if (ctx.hasEmployerProfile) return "/dashboard/employer";
  if (ctx.hasTalentProfile) return "/dashboard/talent";
  return "/onboarding";
}
