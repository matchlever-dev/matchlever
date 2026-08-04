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
 * Honors a safe `next` path when the user has access; otherwise lands on the
 * candidate profile (or onboarding). Admin/superuser portals are URL-only —
 * they are not the default post-login destination.
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
  const isAdmin = Boolean(profile?.is_admin);

  // Explicit portal deep-links (e.g. /login?next=/admin) still work for staff.
  if (safe?.startsWith("/superuser") && isSuperuser) return safe;
  if (safe?.startsWith("/admin") && isAdmin) return safe;
  if (
    safe &&
    (safe.startsWith("/dashboard") ||
      safe.startsWith("/onboarding") ||
      safe === "/")
  ) {
    // Returning candidates who already finished onboarding should land on the
    // dashboard even when OAuth used next=/onboarding.
    if (safe.startsWith("/onboarding")) {
      const { data: candidate } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (candidate) return "/dashboard/candidate";
    }
    return safe;
  }

  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (candidate) return "/dashboard/candidate";
  return "/onboarding";
}
