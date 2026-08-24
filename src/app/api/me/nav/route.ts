import { NextResponse } from "next/server";

import { buildNavSession, GUEST_NAV_SESSION } from "@/lib/auth/nav-session";
import { loadUserRoleContext } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(GUEST_NAV_SESSION);
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(GUEST_NAV_SESSION);
    }

    const ctx = await loadUserRoleContext(supabase, user.id);
    return NextResponse.json(buildNavSession(ctx, true));
  } catch {
    return NextResponse.json(GUEST_NAV_SESSION);
  }
}
