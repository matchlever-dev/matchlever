import { NextResponse } from "next/server";
import { z } from "zod";

import { DEMO_EMPLOYER_JOBS } from "@/lib/dashboard/employer";
import { jobOpeningFormSchema } from "@/lib/employer/job-opening-schema";
import {
  jobOpeningPayloadToRow,
  summarizeJobRow,
} from "@/lib/employer/job-opening-map";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const statusSchema = z.enum(["draft", "active"]);

async function requireEmployer(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("id, company_name, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!employer) {
    return {
      error: NextResponse.json(
        { error: "Employer profile not found", code: "PROFILE_MISSING" },
        { status: 404 }
      ),
    };
  }

  return { user, employer };
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ demo: true, jobs: DEMO_EMPLOYER_JOBS });
  }

  const supabase = await createClient();
  const auth = await requireEmployer(supabase);
  if ("error" in auth && auth.error) return auth.error;

  const { data: jobs, error } = await supabase
    .from("job_postings")
    .select(
      "id, title, status, location_modes, global_city, min_salary, accepted_match_count, match_bundle_purchased_at, updated_at"
    )
    .eq("employer_profile_id", auth.employer!.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[employer jobs list]", error.message);
    return NextResponse.json({ error: "Unable to load jobs" }, { status: 500 });
  }

  return NextResponse.json({
    demo: false,
    jobs: (jobs ?? []).map((job) => summarizeJobRow(job)),
  });
}

export async function POST(request: Request) {
  const json = await request.json();
  const status = statusSchema.catch("draft").parse(json?.status);
  const parsed = jobOpeningFormSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid job opening payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      id: `demo-job-${Date.now()}`,
      status,
    });
  }

  const supabase = await createClient();
  const auth = await requireEmployer(supabase);
  if ("error" in auth && auth.error) return auth.error;

  const row = {
    ...jobOpeningPayloadToRow(parsed.data, status),
    employer_profile_id: auth.employer!.id,
    company_name: auth.employer!.company_name,
  };

  const { data: inserted, error } = await supabase
    .from("job_postings")
    .insert(row)
    .select("id, status")
    .single();

  if (error || !inserted) {
    console.error("[employer jobs create]", error?.message);
    return NextResponse.json(
      { error: "Unable to create job opening. Apply the latest migration if columns are missing." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    status: inserted.status,
  });
}
