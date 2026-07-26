import type { SupabaseClient } from "@supabase/supabase-js";

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
 * Honors a safe `next` path when the user has access; otherwise role/profile defaults.
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

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin, is_superuser")
    .eq("id", user.id)
    .maybeSingle();

  const isSuperuser = Boolean(profile?.is_superuser);
  const isAdmin = Boolean(profile?.is_admin || profile?.is_superuser);

  if (safe?.startsWith("/superuser") && isSuperuser) return safe;
  if (safe?.startsWith("/admin") && isAdmin) return safe;
  if (
    safe &&
    (safe.startsWith("/dashboard") ||
      safe.startsWith("/onboarding") ||
      safe === "/")
  ) {
    return safe;
  }

  if (isSuperuser) return "/superuser";
  if (isAdmin) return "/admin";

  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (candidate) return "/dashboard/seeker";
  return "/onboarding";
}
