import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/api-guards";
import {
  DEMO_ADMIN_EMPLOYERS,
  type AdminEmployerRow,
} from "@/lib/admin/demo";
import {
  companyNameFromAuthMetadata,
  isPlaceholderCompanyName,
  resolvedCompanyName,
} from "@/lib/employer/company-name";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const employerIds = (employers ?? []).map((e) => e.id);

  const [{ data: users }, { data: jobs }] = await Promise.all([
    userIds.length
      ? supabase
          .from("user_profiles")
          .select("id, email, full_name, linkedin_url")
          .in("id", userIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            email: string | null;
            full_name: string | null;
            linkedin_url: string | null;
          }[],
        }),
    employerIds.length
      ? supabase
          .from("job_postings")
          .select("employer_profile_id, company_name, updated_at")
          .in("employer_profile_id", employerIds)
          .order("updated_at", { ascending: false })
      : Promise.resolve({
          data: [] as {
            employer_profile_id: string;
            company_name: string | null;
            updated_at: string;
          }[],
        }),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  const jobCompanyByEmployer = new Map<string, string>();
  for (const job of jobs ?? []) {
    if (jobCompanyByEmployer.has(job.employer_profile_id)) continue;
    const company = resolvedCompanyName(job.company_name);
    if (company) jobCompanyByEmployer.set(job.employer_profile_id, company);
  }

  const companyFromAuth = new Map<string, string>();
  const admin = createAdminClient();
  const needsAuthLookup = (employers ?? []).some(
    (e) =>
      isPlaceholderCompanyName(e.company_name) &&
      !jobCompanyByEmployer.has(e.id)
  );
  if (admin && needsAuthLookup) {
    const userIdSet = new Set(userIds);
    for (let page = 1; page <= 20; page += 1) {
      const { data, error: listError } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (listError || !data?.users?.length) break;
      for (const authUser of data.users) {
        if (!userIdSet.has(authUser.id)) continue;
        const company = companyNameFromAuthMetadata(authUser);
        if (company) companyFromAuth.set(authUser.id, company);
      }
      if (data.users.length < 200) break;
    }
  }

  const backfills: Array<{ id: string; company_name: string }> = [];

  const rows: AdminEmployerRow[] = (employers ?? []).map((e) => {
    const user = userMap.get(e.user_id);
    const stored = resolvedCompanyName(e.company_name);
    const fromJob = jobCompanyByEmployer.get(e.id) ?? null;
    const fromAuth = companyFromAuth.get(e.user_id) ?? null;
    const companyName = stored || fromJob || fromAuth || e.company_name;

    if (!stored && (fromJob || fromAuth)) {
      backfills.push({ id: e.id, company_name: (fromJob || fromAuth)! });
    }

    return {
      id: e.id,
      user_id: e.user_id,
      email: user?.email ?? null,
      full_name: user?.full_name ?? null,
      linkedin_url: user?.linkedin_url ?? null,
      company_name: companyName,
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

  if (backfills.length && admin) {
    await Promise.all(
      backfills.map((row) =>
        admin
          .from("employer_profiles")
          .update({ company_name: row.company_name })
          .eq("id", row.id)
      )
    );
  }

  return NextResponse.json({ demo: false, employers: rows });
}

const statusSchema = z.object({
  employerId: z.string().min(1),
  status: z.enum(["active", "on_hold", "inactive"]),
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
