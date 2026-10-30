import { createHmac, timingSafeEqual } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export const UNSUBSCRIBED_EMAIL_MESSAGE =
  "This email address has unsubscribed from automated MatchLever emails.";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getUnsubscribeSecret() {
  return (
    process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "matchlever-unsubscribe-dev"
  );
}

export function createUnsubscribeToken(email: string) {
  const normalized = normalizeEmail(email);
  const payload = Buffer.from(normalized, "utf8").toString("base64url");
  const mac = createHmac("sha256", getUnsubscribeSecret())
    .update(normalized)
    .digest("base64url");
  return `${payload}.${mac}`;
}

export function emailFromUnsubscribeToken(token: string): string | null {
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;

  let email: string;
  try {
    email = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const normalized = normalizeEmail(email);
  if (!normalized.includes("@") || normalized !== email) return null;

  const expected = createHmac("sha256", getUnsubscribeSecret())
    .update(normalized)
    .digest("base64url");
  const actualBuf = Buffer.from(mac);
  const expectedBuf = Buffer.from(expected);
  if (
    actualBuf.length !== expectedBuf.length ||
    !timingSafeEqual(actualBuf, expectedBuf)
  ) {
    return null;
  }

  return normalized;
}

export function maskEmail(email: string) {
  const [user, domain] = normalizeEmail(email).split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 1);
  return `${visible}***@${domain}`;
}

export async function isEmailUnsubscribed(email: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { data, error } = await admin
    .from("email_unsubscribes")
    .select("email")
    .eq("email", normalizeEmail(email))
    .maybeSingle();

  if (error) {
    console.error("[email unsubscribe lookup]", error.message);
    return false;
  }

  return Boolean(data);
}

export async function recordEmailUnsubscribe(email: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required to save unsubscribe preferences."
    );
  }

  const { error } = await admin.from("email_unsubscribes").upsert(
    {
      email: normalizeEmail(email),
      unsubscribed_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function listUnsubscribedEmails(): Promise<Set<string>> {
  const admin = createAdminClient();
  if (!admin) return new Set();

  const emails = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from("email_unsubscribes")
      .select("email")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("[email unsubscribe list]", error.message);
      break;
    }

    const page = data ?? [];
    for (const row of page) emails.add(row.email);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return emails;
}
