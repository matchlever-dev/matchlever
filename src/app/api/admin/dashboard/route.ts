import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/api-guards";
import { buildAdminDashboardData } from "@/lib/dashboard/admin-dashboard-data";
import {
  getAdminDashboardMock,
  parseChartRangeKey,
} from "@/lib/dashboard/admin-metrics";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const range = parseChartRangeKey(searchParams.get("range"));

  if (!isSupabaseConfigured() || auth.actor.demo) {
    return NextResponse.json(getAdminDashboardMock(range));
  }

  try {
    const admin = createAdminClient();
    const supabase = admin ?? (await createClient());
    const data = await buildAdminDashboardData(supabase, range);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load admin dashboard metrics";
    console.error("[/api/admin/dashboard]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
