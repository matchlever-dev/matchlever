import { NextResponse } from "next/server";
import { z } from "zod";

import { respondToMatchByToken } from "@/lib/matching/create-match";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Legacy Accept-only endpoint — prefer /api/matches/respond. */

const bodySchema = z.object({
  token: z.string().min(16),
});

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  return accept(token);
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid accept token" }, { status: 400 });
  }
  return accept(parsed.data.token);
}

async function accept(token: string) {
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "Invalid accept token" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      alreadyAccepted: false,
      alreadyDecided: false,
      decision: "accept",
      employerResponse: "accepted",
      jobTitle: "Staff Platform Engineer",
      companyName: "Acme Systems",
      talentHeadline: "Staff Platform Engineer",
      linkedinUrl: "https://www.linkedin.com/in/sam-patel",
      linkedinEmailSent: true,
      emailDemo: true,
    });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is required to accept matches from email.",
      },
      { status: 503 }
    );
  }

  const result = await respondToMatchByToken({
    supabase: admin,
    token,
    decision: "accept",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    demo: false,
    alreadyAccepted: result.alreadyDecided,
    alreadyDecided: result.alreadyDecided,
    decision: result.decision,
    employerResponse: result.employerResponse,
    jobTitle: result.jobTitle,
    companyName: result.companyName,
    talentHeadline: result.talentHeadline,
    linkedinUrl: result.linkedinUrl,
    linkedinEmailSent: result.linkedinEmailSent,
    emailDemo: result.emailDemo,
  });
}
