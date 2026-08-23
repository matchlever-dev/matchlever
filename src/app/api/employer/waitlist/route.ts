import { NextResponse } from "next/server";
import { z } from "zod";

import {
  displayNameFromAuthUser,
  splitNameFromAuthUser,
} from "@/lib/auth/display-name";
import { captureTalentLinkedInUrl } from "@/lib/auth/linkedin-url";
import { employerWaitlistSchema } from "@/lib/employer/waitlist-schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function companyFromMetadata(user: {
  user_metadata?: Record<string, unknown> | null;
}): string | null {
  const metadata = user.user_metadata ?? {};
  for (const key of ["company", "organization", "org"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function titleFromMetadata(user: {
  user_metadata?: Record<string, unknown> | null;
}): string | null {
  const metadata = user.user_metadata ?? {};
  for (const key of ["title", "job_title", "headline"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      demo: true,
      authenticated: false,
      prefill: null,
      submitted: false,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      demo: false,
      authenticated: false,
      prefill: null,
      submitted: false,
    });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const [{ data: profile }, { data: employer }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("full_name, email, linkedin_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("employer_profiles")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const linkedInUrl =
    profile?.linkedin_url ||
    (await captureTalentLinkedInUrl({
      stored: profile?.linkedin_url,
      authUser: user,
      accessToken: session?.provider_token,
    }));

  const { firstName, lastName } = splitNameFromAuthUser(user);
  const fullName =
    profile?.full_name || displayNameFromAuthUser(user) || null;
  const nameParts = fullName?.split(/\s+/).filter(Boolean) ?? [];

  return NextResponse.json({
    demo: false,
    authenticated: true,
    submitted: Boolean(employer),
    employerStatus: employer?.status ?? null,
    prefill: {
      firstName: firstName || nameParts[0] || null,
      lastName:
        lastName || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : null),
      email: profile?.email || user.email || null,
      jobTitle: titleFromMetadata(user),
      linkedinUrl: linkedInUrl,
      companyName: companyFromMetadata(user),
    },
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in with LinkedIn first" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = employerWaitlistSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid waitlist payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const [{ data: userProfile }, { data: talent }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("full_name, email, role, linkedin_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("talent_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const linkedInUrl =
    userProfile?.linkedin_url ||
    (await captureTalentLinkedInUrl({
      stored: userProfile?.linkedin_url,
      authUser: user,
      accessToken: session?.provider_token,
    }));

  const companyName =
    companyFromMetadata(user) ||
    z.string().min(1).safeParse(json.companyName).data ||
    "Pending verification";

  const jobTitle = titleFromMetadata(user);
  const fullName =
    userProfile?.full_name || displayNameFromAuthUser(user) || null;

  const nextRole =
    talent || userProfile?.role === "talent" ? "both" : "employer";

  const writer = createAdminClient() ?? supabase;

  const { error: profileError } = await writer.from("user_profiles").upsert(
    {
      id: user.id,
      email: userProfile?.email || user.email,
      full_name: fullName,
      linkedin_url: linkedInUrl,
      role: nextRole,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("[employer waitlist user_profiles]", profileError.message);
    return NextResponse.json(
      { error: "Unable to save employer profile" },
      { status: 500 }
    );
  }

  const { data: employer, error: employerError } = await writer
    .from("employer_profiles")
    .upsert(
      {
        user_id: user.id,
        company_name: companyName,
        title: jobTitle,
        status: "waitlisted",
        user_role: parsed.data.userRole,
        company_website: parsed.data.companyWebsite,
        industry: parsed.data.industry,
        company_size: parsed.data.companySize,
        estimated_roles: parsed.data.estimatedRoles,
        hiring_departments: parsed.data.hiringDepartments,
        work_arrangement: parsed.data.workArrangement,
        first_match_free_claimed: true,
      },
      { onConflict: "user_id" }
    )
    .select("id, status")
    .maybeSingle();

  if (employerError) {
    console.error("[employer waitlist employer_profiles]", employerError.message);
    return NextResponse.json(
      { error: "Unable to join employer waitlist" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    employerId: employer?.id,
    status: employer?.status ?? "waitlisted",
  });
}
