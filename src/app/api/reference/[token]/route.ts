import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;

  if (!token || token.length < 16) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (!admin) {
    // Local demo invite when Supabase is not configured.
    return NextResponse.json({
      token,
      status: "pending",
      relationship: "manager",
      reference_name: null,
      reference_linkedin_url: "https://www.linkedin.com/in/demo-manager",
      candidate_title: "Staff Platform Engineer",
      candidate_tagline: "Cut p99 latency 62% on a multi-region event bus",
      demo: true,
    });
  }

  const { data, error } = await admin.rpc("get_reference_invite", {
    p_token: token,
  });

  if (error) {
    console.error("[reference invite]", error.message);
    return NextResponse.json(
      { error: "Unable to load reference invite" },
      { status: 500 }
    );
  }

  const invite = Array.isArray(data) ? data[0] : data;
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  return NextResponse.json(invite);
}
