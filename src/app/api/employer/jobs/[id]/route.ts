import { NextResponse } from "next/server";
import { z } from "zod";

import { DEMO_EMPLOYER_JOBS } from "@/lib/dashboard/employer";
import { jobOpeningFormSchema } from "@/lib/employer/job-opening-schema";
import {
  jobOpeningPayloadToRow,
  jobRowToFormValues,
  summarizeJobRow,
} from "@/lib/employer/job-opening-map";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const statusSchema = z.enum(["draft", "active", "paused", "closed"]);

const JOB_SELECT =
  "id, title, status, company_name, description, verified_skills, years_experience, suggested_taglines, endorsed_skills, location_modes, max_commute_miles, open_to_relocation, global_city, global_country, timezone, work_hours_start, work_hours_end, min_salary, visa_statuses, accepted_match_count, match_bundle_purchased_at, updated_at, employer_profile_id";

async function requireOwnedJob(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("id")
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

  const { data: job } = await supabase
    .from("job_postings")
    .select(JOB_SELECT)
    .eq("id", jobId)
    .eq("employer_profile_id", employer.id)
    .maybeSingle();

  if (!job) {
    return {
      error: NextResponse.json({ error: "Job not found" }, { status: 404 }),
    };
  }

  return { user, employer, job };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!isSupabaseConfigured()) {
    const demo = DEMO_EMPLOYER_JOBS.find((job) => job.id === id) ?? DEMO_EMPLOYER_JOBS[0];
    return NextResponse.json({
      demo: true,
      job: demo,
      formValues: {
        title: demo.title,
        verifiedSkills: ["TypeScript", "System Design"],
        yearsExperience: 8,
        suggestedTaglines: [
          "Ships platform work under pressure",
          "Turns ambiguity into delivery",
          "Trusted cross-team operator",
        ],
        endorsedSkills: ["arch-systems", "speed-ship", "stake-trust"],
        locationModes: demo.locationModes,
        maxCommuteMiles: demo.globalCity ? 30 : null,
        openToRelocation: demo.globalCity ? false : null,
        globalCity: demo.globalCity ?? "",
        globalCountry: demo.globalCity ? "United States" : "",
        customCity: "",
        timezone: "America/Los_Angeles",
        workHoursStart: "09:00",
        workHoursEnd: "17:00",
        minSalary: demo.minSalary ?? 140000,
        visaStatuses: ["none"],
      },
    });
  }

  const supabase = await createClient();
  const auth = await requireOwnedJob(supabase, id);
  if ("error" in auth && auth.error) return auth.error;

  return NextResponse.json({
    demo: false,
    job: summarizeJobRow(auth.job!),
    formValues: jobRowToFormValues(auth.job!),
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const json = await request.json();
  const parsed = jobOpeningFormSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid job opening payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const nextStatus = statusSchema
    .optional()
    .parse(json?.status);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      id,
      status: nextStatus ?? "draft",
    });
  }

  const supabase = await createClient();
  const auth = await requireOwnedJob(supabase, id);
  if ("error" in auth && auth.error) return auth.error;

  const publishStatus =
    nextStatus === "active" || (!nextStatus && auth.job!.status === "active")
      ? "active"
      : "draft";
  const row = jobOpeningPayloadToRow(parsed.data, publishStatus);

  const { data: updated, error } = await supabase
    .from("job_postings")
    .update({
      ...row,
      status: nextStatus ?? row.status,
    })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error || !updated) {
    console.error("[employer jobs patch]", error?.message);
    return NextResponse.json(
      { error: "Unable to update job opening" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: updated.id,
    status: updated.status,
  });
}
