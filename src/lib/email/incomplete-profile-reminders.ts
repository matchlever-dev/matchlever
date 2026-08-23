import { computeTalentMissing } from "@/lib/admin/demo";
import { REQUIRED_VERIFIED_REFERENCES } from "@/lib/dashboard/talent";
import {
  getTalentProfileReminderUrl,
  sendIncompleteProfileReminderEmail,
} from "@/lib/email/resend";
import { listUnsubscribedEmails, normalizeEmail } from "@/lib/email/unsubscribe";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const TALENT_ROLES = new Set(["talent", "both"]);
const PAGE_SIZE = 1000;

type ReminderUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
};

type ReminderProfile = {
  id: string;
  user_id: string;
  headline: string | null;
  global_city: string | null;
  global_country: string | null;
  work_hours_start: string | null;
  work_hours_end: string | null;
  raw_resume_text: string | null;
  sanitized_summary: string | null;
};

export type IncompleteProfileReminderResult = {
  ok: true;
  demo: boolean;
  eligible: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
};

function incompleteItemLabels(input: {
  missing: ReturnType<typeof computeTalentMissing>;
  verifiedReferenceCount: number;
}): string[] {
  const items: string[] = [];
  if (input.missing.resume) {
    items.push("Upload your resume");
  }
  if (input.missing.profile) {
    items.push("Add profile details (title, location, and working hours)");
  }
  if (input.missing.references) {
    items.push(
      `Complete verified references (${input.verifiedReferenceCount} of ${REQUIRED_VERIFIED_REFERENCES})`
    );
  }
  return items;
}

async function fetchAllRows<T>(
  loadPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await loadPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

export async function runIncompleteProfileReminders(): Promise<IncompleteProfileReminderResult> {
  if (!isSupabaseConfigured()) {
    console.info("[incomplete-profile-reminders demo] skipped (no Supabase)");
    return {
      ok: true,
      demo: true,
      eligible: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required to send incomplete-profile reminders."
    );
  }

  const users = await fetchAllRows<ReminderUser>((from, to) =>
    admin
      .from("user_profiles")
      .select("id, email, full_name, role")
      .range(from, to)
  );

  const profiles = await fetchAllRows<ReminderProfile>((from, to) =>
    admin
      .from("talent_profiles")
      .select(
        "id, user_id, headline, global_city, global_country, work_hours_start, work_hours_end, raw_resume_text, sanitized_summary"
      )
      .range(from, to)
  );

  const profileByUser = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const profileIds = profiles.map((profile) => profile.id);

  const references: { talent_profile_id: string; status: string }[] = [];
  for (let i = 0; i < profileIds.length; i += PAGE_SIZE) {
    const chunk = profileIds.slice(i, i + PAGE_SIZE);
    if (chunk.length === 0) continue;
    const { data, error } = await admin
      .from("talent_references")
      .select("talent_profile_id, status")
      .in("talent_profile_id", chunk);
    if (error) throw new Error(error.message);
    references.push(...(data ?? []));
  }

  const refsByTalent = new Map<string, { status: string }[]>();
  for (const ref of references) {
    const list = refsByTalent.get(ref.talent_profile_id) ?? [];
    list.push({ status: ref.status });
    refsByTalent.set(ref.talent_profile_id, list);
  }

  const unsubscribed = await listUnsubscribedEmails();

  const recipients = users.flatMap((user) => {
    const email = user.email?.trim();
    if (!email) return [];
    if (unsubscribed.has(normalizeEmail(email))) return [];

    const profile = profileByUser.get(user.id) ?? null;
    const isTalentRole = TALENT_ROLES.has(user.role);
    if (!isTalentRole && !profile) return [];

    const refs = profile ? refsByTalent.get(profile.id) ?? [] : [];
    const missing = computeTalentMissing({
      has_talent_profile: Boolean(profile),
      headline: profile?.headline ?? null,
      global_city: profile?.global_city ?? null,
      global_country: profile?.global_country ?? null,
      work_hours_start: profile?.work_hours_start ?? null,
      work_hours_end: profile?.work_hours_end ?? null,
      raw_resume_text: profile?.raw_resume_text ?? null,
      sanitized_summary: profile?.sanitized_summary ?? null,
      references: refs,
    });

    if (!missing.resume && !missing.profile && !missing.references) {
      return [];
    }

    const verifiedReferenceCount = refs.filter((r) => r.status === "verified")
      .length;

    return [
      {
        email,
        fullName: user.full_name,
        hasTalentProfile: Boolean(profile),
        incompleteItems: incompleteItemLabels({
          missing,
          verifiedReferenceCount,
        }),
      },
    ];
  });

  const errors: string[] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let demo = false;

  for (const recipient of recipients) {
    try {
      const result = await sendIncompleteProfileReminderEmail({
        to: recipient.email,
        talentName: recipient.fullName,
        incompleteItems: recipient.incompleteItems,
        profileUrl: getTalentProfileReminderUrl(recipient.hasTalentProfile),
      });
      if (result.skipped) {
        skipped += 1;
        continue;
      }
      if (result.demo) demo = true;
      sent += 1;
    } catch (error) {
      failed += 1;
      const message =
        error instanceof Error ? error.message : "Failed to send reminder";
      errors.push(`${recipient.email}: ${message}`);
      console.error(
        "[incomplete-profile-reminders]",
        recipient.email,
        message
      );
    }
  }

  return {
    ok: true,
    demo,
    eligible: recipients.length,
    sent,
    skipped,
    failed,
    errors: errors.slice(0, 20),
  };
}
