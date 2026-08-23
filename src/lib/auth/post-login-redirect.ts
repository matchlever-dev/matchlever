import type { SupabaseClient } from "@supabase/supabase-js";

import {
  loadUserRoleContext,
  resolveRoleGatewayPath,
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

  const gateway = resolveRoleGatewayPath(ctx);

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
      return gateway ?? "/dashboard/talent?edit=1";
    }
    if (safe.startsWith("/dashboard/employer") && !ctx.hasEmployerProfile) {
      return "/employer/waitlist";
    }
    if (safe.startsWith("/dashboard/talent") && !ctx.hasTalentProfile) {
      return "/onboarding";
    }
    return safe;
  }

  if (gateway && !safe) return gateway;

  if (safe?.startsWith("/dashboard/employer")) {
    return ctx.hasEmployerProfile ? safe : "/employer/waitlist";
  }

  if (ctx.hasTalentProfile) return "/dashboard/talent";
  if (ctx.hasEmployerProfile) return "/dashboard/employer";
  return "/onboarding";
}
