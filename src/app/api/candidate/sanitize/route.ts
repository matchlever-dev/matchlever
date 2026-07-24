import { NextResponse } from "next/server";

import { sanitizeResumeWithGroq } from "@/lib/ai/groq";
import {
  extractResumeText,
  isSupportedResumeFile,
} from "@/lib/resume/extract-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
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

    return NextResponse.json(sanitized);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected sanitize failure.";

    const invalidKey =
      /invalid api key/i.test(message) || /invalid_api_key/i.test(message);
    const missingKey = message.includes("GROQ_API_KEY");

    const status = missingKey || invalidKey
      ? 500
      : message.includes("Unsupported")
        ? 400
        : 502;

    const clientMessage = invalidKey
      ? "Invalid GROQ_API_KEY. Create a new key at https://console.groq.com/keys, set it in .env.local, and restart the dev server."
      : message;

    console.error("[/api/candidate/sanitize]", message);
    return NextResponse.json({ error: clientMessage }, { status });
  }
}

function getResumeFile(formData: FormData): File | null {
  const candidate = formData.get("resume") ?? formData.get("file");
  if (candidate instanceof File && candidate.size > 0) {
    return candidate;
  }
  return null;
}
