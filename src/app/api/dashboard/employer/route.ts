import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DEMO_EMPLOYER_DASHBOARD } from "@/lib/dashboard/employer";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(DEMO_EMPLOYER_DASHBOARD);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: employer }, { data: profile }] = await Promise.all([
    supabase
      .from("employer_profiles")
      .select(
        "id, company_name, title, status, user_role, company_website, industry, company_size, estimated_roles, hiring_departments, work_arrangement, first_match_free_claimed, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_profiles")
      .select("full_name, email, linkedin_url, role, is_admin, is_superuser")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!employer) {
    return NextResponse.json(
      { error: "Employer profile not found", code: "PROFILE_MISSING" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    demo: false,
    profile: {
      id: employer.id,
      companyName: employer.company_name,
      title: employer.title,
      status: employer.status,
      userRole: employer.user_role,
      companyWebsite: employer.company_website,
      industry: employer.industry,
      companySize: employer.company_size,
      estimatedRoles: employer.estimated_roles,
      hiringDepartments: employer.hiring_departments ?? [],
      workArrangement: employer.work_arrangement,
      firstMatchFreeClaimed: employer.first_match_free_claimed,
      createdAt: employer.created_at,
      updatedAt: employer.updated_at,
    },
    user: {
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? user.email ?? null,
      linkedinUrl: profile?.linkedin_url ?? null,
      role: profile?.role ?? "employer",
      isAdmin: Boolean(profile?.is_admin),
      isSuperuser: Boolean(profile?.is_superuser),
    },
  });
}
