import { NextResponse } from "next/server";

import { sanitizeResumeWithGroq } from "@/lib/ai/groq";
import {
  extractResumeText,
  isSupportedResumeFile,
} from "@/lib/resume/extract-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/talent/sanitize",
    accepts: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    groqConfigured: Boolean(
      process.env.GROQ_API_KEY?.trim() &&
        !process.env.GROQ_API_KEY.includes("your-")
    ),
  });
}

export async function POST(request: Request) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Expected multipart form upload with field \"resume\"." },
        { status: 400 }
      );
    }

    const file = getResumeFile(formData);

    if (!file) {
      return NextResponse.json(
        {
          error:
            'Missing resume file. Upload multipart field "resume" (PDF or DOCX).',
        },
        { status: 400 }
      );
    }

    if (!isSupportedResumeFile(file)) {
      return NextResponse.json(
        { error: "Unsupported file type. Only PDF and DOCX are accepted." },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    const rawText = await extractResumeText(file);
    if (rawText.length < 80) {
      return NextResponse.json(
        {
          error:
            "Extracted resume text is too short to sanitize. Upload a fuller resume.",
        },
        { status: 422 }
      );
    }

    const sanitized = await sanitizeResumeWithGroq(rawText);

    // Cap stored raw text (same limit as the Groq prompt) for admin audit.
    return NextResponse.json({
      ...sanitized,
      raw_resume_text: rawText.slice(0, 60_000),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected sanitize failure.";

    const invalidKey =
      /invalid api key/i.test(message) || /invalid_api_key/i.test(message);
    const missingKey = message.includes("GROQ_API_KEY");
    const modelMissing =
      /model_not_found/i.test(message) ||
      /does not exist or you do not have access/i.test(message);

    const status = missingKey || invalidKey
      ? 500
      : message.includes("Unsupported")
        ? 400
        : 502;

    const clientMessage = invalidKey
      ? "Invalid GROQ_API_KEY. Create a new key at https://console.groq.com/keys and set it in Vercel Environment Variables, then redeploy."
      : missingKey
        ? "Missing GROQ_API_KEY on the server. Add it in Vercel Environment Variables and redeploy."
        : modelMissing
          ? "Groq model is unavailable. llama-3.3-70b-versatile was retired on Aug 16, 2026 — set GROQ_MODEL to openai/gpt-oss-120b and redeploy."
          : message;

    console.error("[/api/talent/sanitize]", message);
    return NextResponse.json({ error: clientMessage }, { status });
  }
}

function getResumeFile(formData: FormData): File | null {
  const talent = formData.get("resume") ?? formData.get("file");
  if (talent instanceof File && talent.size > 0) {
    return talent;
  }
  return null;
}
