import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/api-guards";
import {
  linkedinUrlFromAuthUser,
  resolveCandidateLinkedInUrl,
} from "@/lib/auth/linkedin-url";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEMO_ADMIN_CANDIDATES,
  averageAuthenticityScore,
  computeCandidateMissing,
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

function locationModesFromProfile(profile: {
  location_modes?: string[] | null;
  location_mode?: string | null;
} | null): string[] {
  const modes = (profile?.location_modes ?? []).filter(Boolean);
  if (modes.length) return modes;
  if (profile?.location_mode) return [profile.location_mode];
  return [];
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

  // Every logged-in user has a user_profiles row; candidate_profiles may be absent
  // until onboarding completes.
  let { data: users, error: usersError } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, linkedin_url, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (usersError?.message?.includes("linkedin_url")) {
    const fallback = await supabase
      .from("user_profiles")
      .select("id, email, full_name, created_at, updated_at")
      .order("updated_at", { ascending: false });
    users = (fallback.data ?? []).map((user) => ({
      ...user,
      linkedin_url: null as string | null,
    }));
    usersError = fallback.error;
  }

  if (usersError) {
    console.error("[admin candidates users]", usersError.message);
    return NextResponse.json(
      { error: "Unable to load candidates" },
      { status: 500 }
    );
  }

  const linkedInFromAuth = new Map<string, string>();
  const admin = createAdminClient();
  if (admin) {
    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error || !data?.users?.length) break;
      for (const authUser of data.users) {
        const url = linkedinUrlFromAuthUser(authUser);
        if (url) linkedInFromAuth.set(authUser.id, url);
      }
      if (data.users.length < 200) break;
    }
    const missingStored = (users ?? []).filter(
      (row) => !row.linkedin_url && linkedInFromAuth.has(row.id)
    );
    if (missingStored.length) {
      await Promise.all(
        missingStored.map((row) =>
          admin
            .from("user_profiles")
            .update({ linkedin_url: linkedInFromAuth.get(row.id)! })
            .eq("id", row.id)
        )
      );
    }
  }

  const userIds = (users ?? []).map((u) => u.id);

  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase
        .from("candidate_profiles")
        .select(
          "id, user_id, headline, status, global_city, global_country, timezone_offset, work_hours_start, work_hours_end, location_modes, location_mode, raw_resume_text, sanitized_summary, updated_at"
        )
        .in("user_id", userIds)
    : { data: [] as never[], error: null };

  if (profilesError) {
    console.error("[admin candidates profiles]", profilesError.message);
    return NextResponse.json(
      { error: "Unable to load candidates" },
      { status: 500 }
    );
  }

  const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const profileIds = (profiles ?? []).map((p) => p.id);

  const { data: references } = profileIds.length
    ? await supabase
        .from("candidate_references")
        .select(
          "id, candidate_profile_id, reference_email, reference_name, relationship, reference_linkedin_url, authenticity_score, authenticity_flags, status"
        )
        .in("candidate_profile_id", profileIds)
    : { data: [] as never[] };

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
      reference_name: ref.reference_name,
      relationship: ref.relationship,
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

  const candidates: AdminCandidateRow[] = (users ?? []).map((user) => {
    const profile = profileByUser.get(user.id) ?? null;
    const refs = profile ? refsByCandidate.get(profile.id) ?? [] : [];
    const hasProfile = Boolean(profile);
    const base = {
      has_candidate_profile: hasProfile,
      headline: profile?.headline ?? null,
      global_city: profile?.global_city ?? null,
      global_country: profile?.global_country ?? null,
      work_hours_start: profile?.work_hours_start ?? null,
      work_hours_end: profile?.work_hours_end ?? null,
      raw_resume_text: profile?.raw_resume_text ?? null,
      sanitized_summary: profile?.sanitized_summary ?? null,
      references: refs,
    };

    return {
      // Prefer candidate profile id when present; otherwise key by user id.
      id: profile?.id ?? user.id,
      user_id: user.id,
      has_candidate_profile: hasProfile,
      headline: base.headline,
      status: profile?.status ?? "incomplete",
      global_city: base.global_city,
      global_country: base.global_country,
      timezone_offset: profile?.timezone_offset ?? null,
      work_hours_start: base.work_hours_start,
      work_hours_end: base.work_hours_end,
      location_modes: locationModesFromProfile(profile),
      raw_resume_text: base.raw_resume_text,
      sanitized_summary: base.sanitized_summary,
      email: user.email,
      full_name: user.full_name,
      linkedin_url: resolveCandidateLinkedInUrl({
        stored: user.linkedin_url || linkedInFromAuth.get(user.id) || null,
        resumeText: profile?.raw_resume_text,
      }),
      updated_at: profile?.updated_at ?? user.updated_at ?? user.created_at,
      avg_authenticity_score: averageAuthenticityScore(refs),
      references: refs,
      missing: computeCandidateMissing(base),
    };
  });

  candidates.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  if (admin) {
    const storedById = new Map(
      (users ?? []).map((row) => [row.id, row.linkedin_url])
    );
    void Promise.all(
      candidates
        .filter(
          (row) =>
            Boolean(row.linkedin_url) &&
            row.linkedin_url !== storedById.get(row.user_id)
        )
        .map((row) =>
          admin
            .from("user_profiles")
            .update({ linkedin_url: row.linkedin_url })
            .eq("id", row.user_id)
        )
    );
  }

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
    // Destructive deletes are admin-only (Admin Portal). Superuser portal has no delete UI.
    if (!auth.actor.demo && !auth.actor.hasAdminFlag) {
      return NextResponse.json(
        { error: "Only admins can delete candidate profiles" },
        { status: 403 }
      );
    }

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
