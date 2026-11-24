import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/api-guards";
import { DEMO_ADMIN_JOB_OPENINGS } from "@/lib/admin/demo";
import { listJobOpeningsForAdmin } from "@/lib/matching/job-opening-admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  if (auth.actor.demo) {
    return NextResponse.json({
      demo: true,
      jobs: DEMO_ADMIN_JOB_OPENINGS,
    });
  }

  try {
    const supabase = await createClient();
    const jobs = await listJobOpeningsForAdmin(supabase);
    return NextResponse.json({
      demo: false,
      jobs,
      emptyReason:
        jobs.length === 0
          ? "no_job_postings"
          : undefined,
    });
  } catch (err) {
    console.error(
      "[admin job openings]",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      {
        error: "Unable to load job openings",
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}
