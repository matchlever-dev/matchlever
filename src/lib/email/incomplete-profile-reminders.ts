import { computeTalentMissing } from "@/lib/admin/demo";
import { REQUIRED_VERIFIED_REFERENCES } from "@/lib/dashboard/talent";
import {
  getTalentProfileReminderUrl,
  sendMissingReferencesReminderEmail,
  sendNoProgressReminderEmail,
  sendReferenceInviteEmail,
} from "@/lib/email/resend";
import { listUnsubscribedEmails, normalizeEmail } from "@/lib/email/unsubscribe";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const TALENT_ROLES = new Set(["talent", "both"]);
const PAGE_SIZE = 1000;
/** Skip reference reminders for invites sent in the last 2 days. */
const PENDING_REF_MIN_AGE_MS = 2 * 24 * 60 * 60 * 1000;

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

type ReminderReference = {
  id: string;
  talent_profile_id: string;
  reference_email: string;
  status: string;
  verification_token: string;
  created_at: string;
};

export type IncompleteProfileReminderResult = {
  ok: true;
  demo: boolean;
  eligible: number;
  sent: number;
  skipped: number;
  failed: number;
  byType: {
    noProgress: number;
    missingReferences: number;
    pendingReferences: number;
  };
  errors: string[];
};

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
      byType: {
        noProgress: 0,
        missingReferences: 0,
        pendingReferences: 0,
      },
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

  const references: ReminderReference[] = [];
  for (let i = 0; i < profileIds.length; i += PAGE_SIZE) {
    const chunk = profileIds.slice(i, i + PAGE_SIZE);
    if (chunk.length === 0) continue;
    const { data, error } = await admin
      .from("talent_references")
      .select(
        "id, talent_profile_id, reference_email, status, verification_token, created_at"
      )
      .in("talent_profile_id", chunk);
    if (error) throw new Error(error.message);
    references.push(...((data ?? []) as ReminderReference[]));
  }

  const refsByTalent = new Map<string, ReminderReference[]>();
  for (const ref of references) {
    const list = refsByTalent.get(ref.talent_profile_id) ?? [];
    list.push(ref);
    refsByTalent.set(ref.talent_profile_id, list);
  }

  const unsubscribed = await listUnsubscribedEmails();
  const now = Date.now();

  type TalentJob =
    | {
        kind: "no_progress";
        email: string;
        fullName: string | null;
      }
    | {
        kind: "missing_references";
        email: string;
        fullName: string | null;
        invitedCount: number;
      };

  const talentJobs: TalentJob[] = [];

  for (const user of users) {
    const email = user.email?.trim();
    if (!email) continue;
    if (unsubscribed.has(normalizeEmail(email))) continue;

    const profile = profileByUser.get(user.id) ?? null;
    const isTalentRole = TALENT_ROLES.has(user.role);
    if (!isTalentRole && !profile) continue;

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

    const profileReady = !missing.resume && !missing.profile;
    const invitedCount = refs.length;

    if (!profileReady) {
      talentJobs.push({
        kind: "no_progress",
        email,
        fullName: user.full_name,
      });
      continue;
    }

    if (invitedCount < REQUIRED_VERIFIED_REFERENCES) {
      talentJobs.push({
        kind: "missing_references",
        email,
        fullName: user.full_name,
        invitedCount,
      });
    }
  }

  type PendingRefJob = {
    email: string;
    talentName: string;
    talentTitle: string;
    token: string;
  };

  const pendingRefJobs: PendingRefJob[] = [];
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const userById = new Map(users.map((u) => [u.id, u]));

  for (const ref of references) {
    if (ref.status !== "pending") continue;
    const createdAt = Date.parse(ref.created_at);
    if (!Number.isNaN(createdAt) && now - createdAt < PENDING_REF_MIN_AGE_MS) {
      continue;
    }
    const email = ref.reference_email?.trim();
    if (!email) continue;
    if (unsubscribed.has(normalizeEmail(email))) continue;

    const profile = profileById.get(ref.talent_profile_id);
    if (!profile) continue;
    const owner = userById.get(profile.user_id);
    pendingRefJobs.push({
      email,
      talentName: owner?.full_name?.trim() || "a MatchLever talent",
      talentTitle: profile.headline?.trim() || "MatchLever talent",
      token: ref.verification_token,
    });
  }

  const errors: string[] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let demo = false;
  const byType = {
    noProgress: 0,
    missingReferences: 0,
    pendingReferences: 0,
  };

  for (const job of talentJobs) {
    try {
      const result =
        job.kind === "no_progress"
          ? await sendNoProgressReminderEmail({
              to: job.email,
              talentName: job.fullName,
              onboardingUrl: getTalentProfileReminderUrl(false),
            })
          : await sendMissingReferencesReminderEmail({
              to: job.email,
              talentName: job.fullName,
              invitedCount: job.invitedCount,
              requiredCount: REQUIRED_VERIFIED_REFERENCES,
              dashboardUrl: getTalentProfileReminderUrl(true),
            });

      if (result.skipped) {
        skipped += 1;
        continue;
      }
      if (result.demo) demo = true;
      sent += 1;
      if (job.kind === "no_progress") byType.noProgress += 1;
      else byType.missingReferences += 1;
    } catch (error) {
      failed += 1;
      const message =
        error instanceof Error ? error.message : "Failed to send reminder";
      errors.push(`${job.email}: ${message}`);
      console.error("[incomplete-profile-reminders]", job.email, message);
    }
  }

  for (const job of pendingRefJobs) {
    try {
      const result = await sendReferenceInviteEmail({
        to: job.email,
        talentName: job.talentName,
        talentTitle: job.talentTitle,
        token: job.token,
        reminder: true,
      });
      if (result.skipped) {
        skipped += 1;
        continue;
      }
      if (result.demo) demo = true;
      sent += 1;
      byType.pendingReferences += 1;
    } catch (error) {
      failed += 1;
      const message =
        error instanceof Error ? error.message : "Failed to send reminder";
      errors.push(`${job.email}: ${message}`);
      console.error(
        "[incomplete-profile-reminders pending-ref]",
        job.email,
        message
      );
    }
  }

  return {
    ok: true,
    demo,
    eligible: talentJobs.length + pendingRefJobs.length,
    sent,
    skipped,
    failed,
    byType,
    errors: errors.slice(0, 20),
  };
}
