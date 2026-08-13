import { NextResponse } from "next/server";

import { getAppBaseUrl } from "@/lib/email/resend";
import {
  emailFromUnsubscribeToken,
  recordEmailUnsubscribe,
} from "@/lib/email/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function parseUnsubscribeRequest(request: Request): Promise<{
  token: string | null;
  fromForm: boolean;
}> {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("token")?.trim() || null;
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const json = (await request.json()) as { token?: unknown };
      const token =
        typeof json.token === "string" ? json.token.trim() : fromQuery;
      return { token, fromForm: false };
    } catch {
      return { token: fromQuery, fromForm: false };
    }
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    const formToken = form.get("token");
    if (typeof formToken === "string" && formToken.trim()) {
      return { token: formToken.trim(), fromForm: true };
    }
    return { token: fromQuery, fromForm: false };
  }

  return { token: fromQuery, fromForm: false };
}

export async function POST(request: Request) {
  try {
    const { token, fromForm } = await parseUnsubscribeRequest(request);
    const email = token ? emailFromUnsubscribeToken(token) : null;
    if (!email) {
      if (fromForm) {
        const url = new URL("/unsubscribe", getAppBaseUrl());
        url.searchParams.set("error", "invalid");
        return NextResponse.redirect(url, 303);
      }
      return NextResponse.json(
        { error: "Invalid unsubscribe link" },
        { status: 400 }
      );
    }

    await recordEmailUnsubscribe(email);

    if (fromForm) {
      const url = new URL("/unsubscribe", getAppBaseUrl());
      url.searchParams.set("done", "1");
      return NextResponse.redirect(url, 303);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to unsubscribe";
    console.error("[/api/email/unsubscribe]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();
  const page = new URL("/unsubscribe", getAppBaseUrl());
  if (token) page.searchParams.set("token", token);
  return NextResponse.redirect(page, 303);
}
