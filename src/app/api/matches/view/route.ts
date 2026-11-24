import { NextResponse } from "next/server";

import {
  DEMO_EMPLOYER_MATCH_VIEWS,
  getEmployerMatchViewByToken,
} from "@/lib/employer/job-matches";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** GET /api/matches/view?token=… — same incognito profile as the match email. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = (url.searchParams.get("token") || "").trim();
  if (token.length < 16) {
    return NextResponse.json({ error: "Invalid match token" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    const demo = DEMO_EMPLOYER_MATCH_VIEWS[token];
    if (!demo) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    return NextResponse.json({ demo: true, match: demo });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is required to view match profiles from email tokens.",
      },
      { status: 503 }
    );
  }

  const match = await getEmployerMatchViewByToken(admin, token);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  return NextResponse.json({ demo: false, match });
}
