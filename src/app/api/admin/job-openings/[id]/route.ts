import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/api-guards";
import {
  DEMO_ACTIVE_TALENT,
  DEMO_ADMIN_JOB_MATCHES,
  DEMO_ADMIN_JOB_OPENINGS,
} from "@/lib/admin/demo";
import { proposeAiMatches } from "@/lib/matching/ai-match";
import { getJobOpeningDetailForAdmin } from "@/lib/matching/job-opening-admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  if (auth.actor.demo) {
    const job = DEMO_ADMIN_JOB_OPENINGS.find((j) => j.id === id);
    if (!job) {
      return NextResponse.json({ error: "Job opening not found" }, { status: 404 });
    }
    const matches = DEMO_ADMIN_JOB_MATCHES[id] ?? [];
    const matchedIds = new Set(matches.map((m) => m.talent_profile_id));
    return NextResponse.json({
      demo: true,
      job: {
        ...job,
        description:
          "Build and operate the core platform services that power Acme’s product suite.",
        verified_skills: ["TypeScript", "Kubernetes", "Postgres"],
        years_experience: 8,
        suggested_taglines: [
          "Owns multi-region reliability end to end",
          "Cuts p99 latency without sacrificing clarity",
          "Turns fuzzy product asks into durable platform APIs",
        ],
        endorsed_skills: [],
        timezone: "America/Chicago",
        work_hours_start: "09:00:00",
        work_hours_end: "17:00:00",
        visa_statuses: ["none", "uscis_ead"],
        kanban_columns: ["sourced", "screening", "interview", "offer", "hired"],
      },
      matches,
      matchableTalent: DEMO_ACTIVE_TALENT.filter((t) => !matchedIds.has(t.id)),
      aiMatch: await proposeAiMatches({ jobPostingId: id }),
    });
  }

  try {
    const supabase = await createClient();
    const detail = await getJobOpeningDetailForAdmin(supabase, id);
    if (!detail) {
      return NextResponse.json({ error: "Job opening not found" }, { status: 404 });
    }
    return NextResponse.json({
      demo: false,
      ...detail,
      aiMatch: await proposeAiMatches({ jobPostingId: id }),
    });
  } catch (err) {
    console.error(
      "[admin job opening detail]",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: "Unable to load job opening" },
      { status: 500 }
    );
  }
}
