import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type ApiActor = {
  userId: string | null;
  isAdmin: boolean;
  /** Raw `user_profiles.is_admin` — required for destructive admin actions like talent delete. */
  hasAdminFlag: boolean;
  isSuperuser: boolean;
  demo: boolean;
};

/** Resolve caller privileges for admin/superuser API routes. */
export async function requireAdminApi(): Promise<
  { ok: true; actor: ApiActor } | { ok: false; response: NextResponse }
> {
  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      actor: {
        userId: null,
        isAdmin: true,
        hasAdminFlag: true,
        isSuperuser: true,
        demo: true,
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin, is_superuser")
    .eq("id", user.id)
    .maybeSingle();

  const isSuperuser = Boolean(profile?.is_superuser);
  const hasAdminFlag = Boolean(profile?.is_admin);
  const isAdmin = Boolean(hasAdminFlag || isSuperuser);

  if (!isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    actor: {
      userId: user.id,
      isAdmin,
      hasAdminFlag,
      isSuperuser,
      demo: false,
    },
  };
}

/** Admin Portal actions that must not be available to superuser-only accounts. */
export async function requireAdminFlagApi(): Promise<
  { ok: true; actor: ApiActor } | { ok: false; response: NextResponse }
> {
  const result = await requireAdminApi();
  if (!result.ok) return result;
  if (!result.actor.hasAdminFlag) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}

export async function requireSuperuserApi(): Promise<
  { ok: true; actor: ApiActor } | { ok: false; response: NextResponse }
> {
  const result = await requireAdminApi();
  if (!result.ok) return result;
  if (!result.actor.isSuperuser) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}
