import { NextResponse } from "next/server";

import { runIncompleteProfileReminders } from "@/lib/email/incomplete-profile-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorizedCron(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");
  if (secret) {
    return authHeader === `Bearer ${secret}`;
  }
  // Require a secret in production so the endpoint is not public.
  return process.env.VERCEL_ENV !== "production";
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runIncompleteProfileReminders();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to send incomplete-profile reminders";
    console.error("[/api/cron/incomplete-profile-reminders]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
