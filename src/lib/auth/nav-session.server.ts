import {
  buildNavSession,
  GUEST_NAV_SESSION,
} from "@/lib/auth/nav-session";
import { loadUserRoleContext } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function getNavSession() {
  if (!isSupabaseConfigured()) {
    return GUEST_NAV_SESSION;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return GUEST_NAV_SESSION;
    }

    const ctx = await loadUserRoleContext(supabase, user.id);
    return buildNavSession(ctx, true);
  } catch {
    return GUEST_NAV_SESSION;
  }
}
