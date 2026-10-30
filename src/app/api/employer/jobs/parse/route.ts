import { NextResponse } from "next/server";

import { parseJobDescriptionWithGroq } from "@/lib/ai/parse-job";
import {
  extractJobDescriptionText,
  isSupportedJobDescriptionFile,
} from "@/lib/employer/extract-job-description";
import type { JobOpeningFormValues } from "@/lib/employer/job-opening-schema";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/employer/jobs/parse",
    accepts: ["application/pdf", "DOCX", "HTML"],
    groqConfigured: Boolean(
      process.env.GROQ_API_KEY?.trim() &&
        !process.env.GROQ_API_KEY.includes("your-")
    ),
  });
}

export async function POST(request: Request) {
  try {
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Expected multipart form upload with field "jobDescription".' },
        { status: 400 }
      );
    }

    const file = getJobFile(formData);
    if (!file) {
      return NextResponse.json(
        {
          error:
            'Missing file. Upload multipart field "jobDescription" (PDF, DOCX, or HTML).',
        },
        { status: 400 }
      );
    }

    if (!isSupportedJobDescriptionFile(file)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload PDF, DOCX, or HTML." },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    const rawText = await extractJobDescriptionText(file);
    if (rawText.length < 40) {
      return NextResponse.json(
        {
          error:
            "Extracted job description text is too short to parse. Try another file.",
        },
        { status: 422 }
      );
    }

    const parsed = await parseJobDescriptionWithGroq(rawText);
    const formValues = toFormValues(parsed, rawText);

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      raw_job_text: rawText.slice(0, 60_000),
      formValues,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected parse failure.";

    const invalidKey =
      /invalid api key/i.test(message) || /invalid_api_key/i.test(message);
    const missingKey = message.includes("GROQ_API_KEY");
    const modelMissing =
      /model_not_found/i.test(message) ||
      /does not exist or you do not have access/i.test(message);

    const status =
      missingKey || invalidKey
        ? 500
        : message.includes("Unsupported")
          ? 400
          : 502;

    const clientMessage = invalidKey
      ? "Invalid GROQ_API_KEY. Create a new key at https://console.groq.com/keys and set it in Vercel Environment Variables, then redeploy."
      : missingKey
        ? "Missing GROQ_API_KEY on the server. Add it in Vercel Environment Variables and redeploy."
        : modelMissing
          ? "Groq model is unavailable. Set GROQ_MODEL to openai/gpt-oss-120b and redeploy."
          : message;

    console.error("[/api/employer/jobs/parse]", message);
    return NextResponse.json({ error: clientMessage }, { status });
  }
}

function getJobFile(formData: FormData): File | null {
  const candidate =
    formData.get("jobDescription") ??
    formData.get("description") ??
    formData.get("file");
  if (candidate instanceof File && candidate.size > 0) return candidate;
  return null;
}

function toFormValues(
  parsed: Awaited<ReturnType<typeof parseJobDescriptionWithGroq>>,
  rawText: string
): JobOpeningFormValues {
  const needsLocal =
    parsed.location_modes.includes("hybrid") ||
    parsed.location_modes.includes("onsite");

  const country = parsed.global_country?.trim() || "";
  const city = parsed.global_city?.trim() || "";

  return {
    title: parsed.title,
    description: rawText.slice(0, 60_000),
    verifiedSkills: parsed.verified_skills,
    yearsExperience: parsed.years_experience,
    suggestedTaglines: parsed.suggested_taglines,
    endorsedSkills: parsed.endorsed_skills,
    locationModes: parsed.location_modes,
    maxCommuteMiles: needsLocal ? parsed.max_commute_miles : null,
    openToRelocation: needsLocal ? parsed.open_to_relocation : null,
    globalCountry: needsLocal ? country : "",
    globalCity: needsLocal ? city : "",
    customCity:
      needsLocal && (country === "Other" || !city) ? city : "",
    timezone: parsed.timezone,
    workHoursStart: parsed.work_hours_start,
    workHoursEnd: parsed.work_hours_end,
    minSalary: parsed.min_salary,
    visaStatuses: parsed.visa_statuses,
  };
}
