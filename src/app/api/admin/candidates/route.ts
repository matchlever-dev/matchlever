import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/api-guards";
import {
  DEMO_ADMIN_CANDIDATES,
  isLowTrustScore,
  type AdminCandidateRow,
  type AdminReferenceRow,
} from "@/lib/admin/demo";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

function flagsFromJson(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) =>
    typeof v === "string" ? v : JSON.stringify(v)
  );
}

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  if (auth.actor.demo) {
    return NextResponse.json({
      demo: true,
      candidates: DEMO_ADMIN_CANDIDATES,
    });
  }

  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("candidate_profiles")
    .select(
      "id, user_id, headline, status, global_city, global_country, timezone_offset, work_hours_start, work_hours_end, raw_resume_text, sanitized_summary"
    )
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[admin candidates]", error.message);
    return NextResponse.json(
      { error: "Unable to load candidates" },
      { status: 500 }
    );
  }

  const userIds = [...new Set((profiles ?? []).map((p) => p.user_id))];
  const profileIds = (profiles ?? []).map((p) => p.id);

  const [{ data: users }, { data: references }] = await Promise.all([
    userIds.length
      ? supabase
          .from("user_profiles")
          .select("id, email, full_name")
          .in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; email: string | null; full_name: string | null }[] }),
    profileIds.length
      ? supabase
          .from("candidate_references")
          .select(
            "id, candidate_profile_id, reference_email, reference_linkedin_url, authenticity_score, authenticity_flags, status"
          )
          .in("candidate_profile_id", profileIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const refsByCandidate = new Map<string, AdminReferenceRow[]>();

  for (const ref of references ?? []) {
    const flags = flagsFromJson(ref.authenticity_flags);
    const score =
      ref.authenticity_score === null
        ? null
        : Number(ref.authenticity_score);
    const row: AdminReferenceRow = {
      id: ref.id,
      reference_email: ref.reference_email,
      reference_linkedin_url: ref.reference_linkedin_url,
      authenticity_score: score,
      authenticity_flags: flags,
      status: ref.status,
      lowTrust: isLowTrustScore(score, flags),
    };
    const list = refsByCandidate.get(ref.candidate_profile_id) ?? [];
    list.push(row);
    refsByCandidate.set(ref.candidate_profile_id, list);
  }

  const candidates: AdminCandidateRow[] = (profiles ?? []).map((p) => {
    const user = userMap.get(p.user_id);
    return {
      id: p.id,
      user_id: p.user_id,
      headline: p.headline,
      status: p.status,
      global_city: p.global_city,
      global_country: p.global_country,
      timezone_offset: p.timezone_offset,
      work_hours_start: p.work_hours_start,
      work_hours_end: p.work_hours_end,
      raw_resume_text: p.raw_resume_text,
      sanitized_summary: p.sanitized_summary,
      email: user?.email ?? null,
      full_name: user?.full_name ?? null,
      references: refsByCandidate.get(p.id) ?? [],
    };
  });

  return NextResponse.json({ demo: false, candidates });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_status"),
    candidateId: z.string().min(1),
    status: z.enum(["actively_looking", "on_hold"]),
  }),
  z.object({
    action: z.literal("delete"),
    candidateId: z.string().min(1),
  }),
]);

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (auth.actor.demo) {
    return NextResponse.json({ ok: true, demo: true, ...parsed.data });
  }

  const supabase = await createClient();

  if (parsed.data.action === "delete") {
    const { error } = await supabase
      .from("candidate_profiles")
      .delete()
      .eq("id", parsed.data.candidateId);
    if (error) {
      console.error("[admin candidate delete]", error.message);
      return NextResponse.json(
        { error: "Unable to delete candidate" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, deleted: true });
  }

  const { error } = await supabase
    .from("candidate_profiles")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.candidateId);

  if (error) {
    console.error("[admin candidate status]", error.message);
    return NextResponse.json(
      { error: "Unable to update status" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, status: parsed.data.status });
}
