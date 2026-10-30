import { NextResponse } from "next/server";
import { z } from "zod";

import { DEMO_EMPLOYER_DASHBOARD } from "@/lib/dashboard/employer";
import { summarizeJobRow } from "@/lib/employer/job-opening-map";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120),
  companyName: z.string().trim().min(1).max(160),
});

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

  const [{ data: employer }, { data: profile }, { data: talent }] =
    await Promise.all([
      supabase
        .from("employer_profiles")
        .select(
          "id, company_name, title, status, user_role, company_website, industry, company_size, estimated_roles, hiring_departments, work_arrangement, first_match_free_claimed, free_matches_used, ap_invoicing_email, po_number, has_payment_method, stripe_payment_method_brand, stripe_payment_method_last4, created_at, updated_at"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_profiles")
        .select(
          "full_name, email, avatar_url, linkedin_url, role, is_admin, is_superuser"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("talent_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  if (!employer) {
    return NextResponse.json(
      { error: "Employer profile not found", code: "PROFILE_MISSING" },
      { status: 404 }
    );
  }

  const { data: jobs } = await supabase
    .from("job_postings")
    .select(
      "id, title, status, location_modes, global_city, min_salary, accepted_match_count, match_bundle_purchased_at, updated_at"
    )
    .eq("employer_profile_id", employer.id)
    .order("updated_at", { ascending: false });

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
    billing: {
      createdAt: employer.created_at,
      freeMatchesUsed: employer.free_matches_used ?? 0,
      firstMatchFreeClaimed: employer.first_match_free_claimed,
      hasPaymentMethod: Boolean(employer.has_payment_method),
      apInvoicingEmail: employer.ap_invoicing_email,
      poNumber: employer.po_number,
      stripePaymentMethodBrand: employer.stripe_payment_method_brand,
      stripePaymentMethodLast4: employer.stripe_payment_method_last4,
    },
    jobs: (jobs ?? []).map((job) => summarizeJobRow(job)),
    user: {
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? user.email ?? null,
      avatarUrl:
        profile?.avatar_url ??
        (typeof user.user_metadata?.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : null),
      linkedinUrl: profile?.linkedin_url ?? null,
      role: profile?.role ?? "employer",
      isAdmin: Boolean(profile?.is_admin),
      isSuperuser: Boolean(profile?.is_superuser),
      hasTalentProfile: Boolean(talent),
    },
  });
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile payload" }, { status: 400 });
  }

  const { error } = await supabase
    .from("employer_profiles")
    .update({
      title: parsed.data.title,
      company_name: parsed.data.companyName,
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("[employer profile patch]", error.message);
    return NextResponse.json(
      { error: "Unable to update employer profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
