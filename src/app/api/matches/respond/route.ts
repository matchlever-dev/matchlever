import { NextResponse } from "next/server";
import { z } from "zod";

import { respondToMatchByToken } from "@/lib/matching/create-match";
import { isEmployerMatchDecision } from "@/lib/matching/employer-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const bodySchema = z.object({
  token: z.string().min(16),
  decision: z.enum(["accept", "pass"]),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const decision = url.searchParams.get("decision") || "";
  if (!isEmployerMatchDecision(decision)) {
    return NextResponse.json(
      { error: "decision must be accept or pass" },
      { status: 400 }
    );
  }
  return respond(token, decision);
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid respond payload (token + accept|pass)" },
      { status: 400 }
    );
  }
  return respond(parsed.data.token, parsed.data.decision);
}

async function respond(token: string, decision: "accept" | "pass") {
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "Invalid match token" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      decision,
      employerResponse: decision === "accept" ? "accepted" : "passed",
      alreadyDecided: false,
      priorResponse: "pending",
      jobTitle: "Staff Platform Engineer",
      companyName: "Acme Systems",
      talentHeadline: "Staff Platform Engineer",
      linkedinUrl:
        decision === "accept"
          ? "https://www.linkedin.com/in/sam-patel"
          : null,
      linkedinEmailSent: decision === "accept",
      emailDemo: true,
    });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is required to respond to matches from email.",
      },
      { status: 503 }
    );
  }

  const result = await respondToMatchByToken({
    supabase: admin,
    token,
    decision,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    demo: false,
    decision: result.decision,
    employerResponse: result.employerResponse,
    alreadyDecided: result.alreadyDecided,
    priorResponse: result.priorResponse,
    jobTitle: result.jobTitle,
    companyName: result.companyName,
    talentHeadline: result.talentHeadline,
    linkedinUrl: result.linkedinUrl,
    linkedinEmailSent: result.linkedinEmailSent,
    emailDemo: result.emailDemo,
  });
}
