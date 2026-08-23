import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/api-guards";
import {
  DEMO_ADMIN_EMPLOYERS,
  type AdminEmployerRow,
} from "@/lib/admin/demo";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  if (auth.actor.demo) {
    return NextResponse.json({
      demo: true,
      employers: DEMO_ADMIN_EMPLOYERS,
    });
  }

  const supabase = await createClient();

  const { data: employers, error } = await supabase
    .from("employer_profiles")
    .select(
      "id, user_id, company_name, title, status, user_role, company_website, industry, company_size, estimated_roles, hiring_departments, work_arrangement, first_match_free_claimed, created_at, updated_at"
    )
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[admin employers]", error.message);
    return NextResponse.json(
      { error: "Unable to load employers" },
      { status: 500 }
    );
  }

  const userIds = [...new Set((employers ?? []).map((e) => e.user_id))];
  const { data: users } = userIds.length
    ? await supabase
        .from("user_profiles")
        .select("id, email, full_name, linkedin_url")
        .in("id", userIds)
    : { data: [] as { id: string; email: string | null; full_name: string | null; linkedin_url: string | null }[] };

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  const rows: AdminEmployerRow[] = (employers ?? []).map((e) => {
    const user = userMap.get(e.user_id);
    return {
      id: e.id,
      user_id: e.user_id,
      email: user?.email ?? null,
      full_name: user?.full_name ?? null,
      linkedin_url: user?.linkedin_url ?? null,
      company_name: e.company_name,
      title: e.title,
      status: e.status,
      user_role: e.user_role,
      company_website: e.company_website,
      industry: e.industry,
      company_size: e.company_size,
      estimated_roles: e.estimated_roles,
      hiring_departments: e.hiring_departments ?? [],
      work_arrangement: e.work_arrangement,
      first_match_free_claimed: e.first_match_free_claimed,
      created_at: e.created_at,
      updated_at: e.updated_at,
    };
  });

  return NextResponse.json({ demo: false, employers: rows });
}

const statusSchema = z.object({
  employerId: z.string().min(1),
  status: z.enum(["waitlisted", "active", "on_hold", "inactive"]),
});

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const parsed = statusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (auth.actor.demo) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employer_profiles")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.employerId);

  if (error) {
    console.error("[admin employer status]", error.message);
    return NextResponse.json(
      { error: "Unable to update employer status" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({
  employerId: z.string().min(1),
});

export async function DELETE(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (auth.actor.demo) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employer_profiles")
    .update({ status: "inactive" })
    .eq("id", parsed.data.employerId);

  if (error) {
    console.error("[admin employer delete]", error.message);
    return NextResponse.json(
      { error: "Unable to delete employer" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
