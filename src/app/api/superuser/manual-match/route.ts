import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSuperuserApi } from "@/lib/auth/api-guards";
import {
  DEMO_ACTIVE_TALENT,
  DEMO_ACTIVE_JOBS,
} from "@/lib/admin/demo";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

function columnsFromJson(value: Json): string[] {
  if (!Array.isArray(value)) {
    return ["sourced", "screening", "interview", "offer", "hired"];
  }
  return value.map(String).filter(Boolean);
}

export async function GET() {
  const auth = await requireSuperuserApi();
  if (!auth.ok) return auth.response;

  if (auth.actor.demo) {
    return NextResponse.json({
      demo: true,
      talent: DEMO_ACTIVE_TALENT,
      jobs: DEMO_ACTIVE_JOBS,
    });
  }

  const supabase = await createClient();

  const [{ data: talent }, { data: jobs }] = await Promise.all([
    supabase
      .from("talent_profiles")
      .select("id, headline, status, user_id")
      .eq("status", "actively_looking")
      .order("updated_at", { ascending: false }),
    supabase
      .from("job_postings")
      .select(
        "id, title, company_name, status, kanban_columns, employer_profile_id"
      )
      .eq("status", "active")
      .order("updated_at", { ascending: false }),
  ]);

  const userIds = [...new Set((talent ?? []).map((c) => c.user_id))];
  const employerIds = [
    ...new Set((jobs ?? []).map((j) => j.employer_profile_id)),
  ];

  const [{ data: users }, { data: employers }] = await Promise.all([
    userIds.length
      ? supabase
          .from("user_profiles")
          .select("id, email, full_name")
          .in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; email: string | null; full_name: string | null }[] }),
    employerIds.length
      ? supabase
          .from("employer_profiles")
          .select("id, user_id, company_name")
          .in("id", employerIds)
      : Promise.resolve({
          data: [] as { id: string; user_id: string; company_name: string }[],
        }),
  ]);

  const employerUserIds = [...new Set((employers ?? []).map((h) => h.user_id))];
  const { data: employerUsers } = employerUserIds.length
    ? await supabase
        .from("user_profiles")
        .select("id, full_name")
        .in("id", employerUserIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const employerMap = new Map((employers ?? []).map((h) => [h.id, h]));
  const employerUserMap = new Map((employerUsers ?? []).map((u) => [u.id, u]));

  return NextResponse.json({
    demo: false,
    talent: (talent ?? []).map((c) => {
      const user = userMap.get(c.user_id);
      return {
        id: c.id,
        headline: c.headline,
        email: user?.email ?? null,
        full_name: user?.full_name ?? null,
        status: c.status,
      };
    }),
    jobs: (jobs ?? []).map((j) => {
      const employer = employerMap.get(j.employer_profile_id);
      const employerUser = employer
        ? employerUserMap.get(employer.user_id)
        : null;
      return {
        id: j.id,
        title: j.title,
        company_name: j.company_name || employer?.company_name || null,
        status: j.status,
        kanban_columns: columnsFromJson(j.kanban_columns),
        employer_name: employerUser?.full_name ?? null,
      };
    }),
  });
}

const matchSchema = z.object({
  talentProfileId: z.string().min(1),
  jobPostingId: z.string().min(1),
  kanbanColumn: z.string().min(1).default("sourced"),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const auth = await requireSuperuserApi();
  if (!auth.ok) return auth.response;

  const parsed = matchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (auth.actor.demo) {
    return NextResponse.json({
      ok: true,
      demo: true,
      is_manual_match: true,
      handshake: {
        id: `demo-hs-${Date.now()}`,
        ...parsed.data,
        is_manual_match: true,
      },
    });
  }

  const supabase = await createClient();

  const [{ data: talent }, { data: job }] = await Promise.all([
    supabase
      .from("talent_profiles")
      .select("id, status")
      .eq("id", parsed.data.talentProfileId)
      .maybeSingle(),
    supabase
      .from("job_postings")
      .select("id, status, kanban_columns")
      .eq("id", parsed.data.jobPostingId)
      .maybeSingle(),
  ]);

  if (!talent || talent.status !== "actively_looking") {
    return NextResponse.json(
      { error: "Talent must be actively looking" },
      { status: 400 }
    );
  }
  if (!job || job.status !== "active") {
    return NextResponse.json(
      { error: "Job posting must be active" },
      { status: 400 }
    );
  }

  const columns = columnsFromJson(job.kanban_columns);
  const column = columns.includes(parsed.data.kanbanColumn)
    ? parsed.data.kanbanColumn
    : columns[0] || "sourced";

  const { data: handshake, error } = await supabase
    .from("match_handshakes")
    .upsert(
      {
        job_posting_id: parsed.data.jobPostingId,
        talent_profile_id: parsed.data.talentProfileId,
        kanban_column: column,
        is_manual_match: true,
        matched_by: auth.actor.userId,
        notes: parsed.data.notes ?? "Concierge Match",
      },
      { onConflict: "job_posting_id,talent_profile_id" }
    )
    .select("id, job_posting_id, talent_profile_id, kanban_column, is_manual_match")
    .maybeSingle();

  if (error) {
    console.error("[manual match]", error.message);
    return NextResponse.json(
      { error: "Unable to create concierge match" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    is_manual_match: true,
    handshake,
  });
}
