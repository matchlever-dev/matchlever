import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type AppSupabase = SupabaseClient<Database>;

export type UserRoleContext = {
  userId: string;
  role: string;
  isAdmin: boolean;
  isSuperuser: boolean;
  hasTalentProfile: boolean;
  hasEmployerProfile: boolean;
  employerStatus: string | null;
};

export async function loadUserRoleContext(
  supabase: AppSupabase,
  userId: string
): Promise<UserRoleContext | null> {
  const [{ data: profile }, { data: talent }, { data: employer }] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("role, is_admin, is_superuser")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("talent_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("employer_profiles")
        .select("id, status")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (!profile) return null;

  return {
    userId,
    role: profile.role,
    isAdmin: Boolean(profile.is_admin),
    isSuperuser: Boolean(profile.is_superuser),
    hasTalentProfile: Boolean(talent),
    hasEmployerProfile: Boolean(employer),
    employerStatus: employer?.status ?? null,
  };
}

export function userHasDualProfiles(ctx: UserRoleContext): boolean {
  return ctx.hasTalentProfile && ctx.hasEmployerProfile;
}

/**
 * Dual-profile users default to the Employer dashboard with in-app switching.
 * Keep `/choose-role` available as an explicit destination, but do not force it.
 */
export function resolveRoleGatewayPath(_ctx: UserRoleContext): string | null {
  return null;
}
