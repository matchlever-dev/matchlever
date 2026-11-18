import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { talentNameForInvite } from "@/lib/auth/display-name";
import { sendReferenceInviteEmail } from "@/lib/email/resend";
import { onboardingFormSchema } from "@/lib/onboarding/form-schema";
import {
  ensureUserProfileForTalent,
  upsertTalentProfileDraft,
} from "@/lib/onboarding/persist-talent-profile";
import {
  REFERRER_LINKEDIN_INVALID_MESSAGE,
  validateReferrerLinkedIn,
} from "@/lib/reference/linkedin-validation";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/auth/stay-signed-in";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function newVerificationToken() {
  return randomBytes(24).toString("hex"); // 48 chars
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = onboardingFormSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid onboarding payload",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (!data.linkedInConnected || !data.incognitoAgreed) {
      return NextResponse.json(
        { error: "Complete identity and privacy steps before finishing." },
        { status: 400 }
      );
    }

    const linkedInResults = await Promise.all(
      data.references.map((ref) => validateReferrerLinkedIn(ref.linkedInUrl))
    );
    const failedIndex = linkedInResults.findIndex((result) => !result.valid);
    if (failedIndex >= 0) {
      const failed = linkedInResults[failedIndex];
      console.info("[onboarding linkedin invalid]", {
        index: failedIndex,
        email: data.references[failedIndex]?.email,
        mode: failed?.mode,
        checks: failed?.checks,
        flags: failed?.flags,
      });
      return NextResponse.json(
        {
          error: REFERRER_LINKEDIN_INVALID_MESSAGE,
          referenceIndex: failedIndex,
        },
        { status: 400 }
      );
    }

    const validatedRefs = data.references.map((ref, index) => {
      const validation = linkedInResults[index]!;
      return {
        email: ref.email.trim().toLowerCase(),
        linkedInUrl: validation.normalizedUrl,
        relationship: ref.relationship,
        flags: [
          "talent_provided_linkedin",
          `validation_mode:${validation.mode}`,
          ...validation.flags,
        ],
      };
    });

    if (!isSupabaseConfigured()) {
      console.info("[onboarding/complete demo]", {
        title: data.anonymousTitle,
        city: data.globalCity,
        references: validatedRefs.map((r) => ({
          email: r.email,
          linkedInUrl: r.linkedInUrl,
        })),
      });
      return NextResponse.json({
        ok: true,
        demo: true,
        message:
          "Demo complete — configure Supabase to persist profiles and send invites.",
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: SESSION_EXPIRED_MESSAGE },
        { status: 401 }
      );
    }

    const userResult = await ensureUserProfileForTalent({
      supabase,
      user,
      talentLinkedInUrl: data.talentLinkedInUrl,
    });
    if (userResult.error) {
      return NextResponse.json({ error: userResult.error }, { status: 500 });
    }

    const talentResult = await upsertTalentProfileDraft({
      supabase,
      userId: user.id,
      data: {
        ...data,
        talentTosAgreed: true,
        anonymousTitle:
          data.anonymousTitle?.trim() || "MatchLever Talent",
      },
    });
    if (talentResult.error || !talentResult.talentId) {
      return NextResponse.json(
        { error: talentResult.error || "Unable to save talent profile" },
        { status: 500 }
      );
    }
    const talentId = talentResult.talentId;

    // Replace reference invites on (re)completion.
    const { error: deleteRefsError } = await supabase
      .from("talent_references")
      .delete()
      .eq("talent_profile_id", talentId);

    if (deleteRefsError) {
      console.error("[onboarding refs delete]", deleteRefsError.message);
      return NextResponse.json(
        { error: "Unable to reset references" },
        { status: 500 }
      );
    }

    const referenceRows = validatedRefs.map((ref) => ({
      talent_profile_id: talentId!,
      reference_email: ref.email,
      reference_linkedin_url: ref.linkedInUrl,
      relationship: ref.relationship,
      status: "pending",
      verification_token: newVerificationToken(),
      authenticity_flags: ref.flags,
    }));

    const { data: insertedRefs, error: insertRefsError } = await supabase
      .from("talent_references")
      .insert(referenceRows)
      .select("id, reference_email, verification_token");

    if (insertRefsError || !insertedRefs) {
      console.error("[onboarding refs insert]", insertRefsError?.message);
      return NextResponse.json(
        { error: "Unable to create reference invites" },
        { status: 500 }
      );
    }

    const talentTitle =
      data.anonymousTitle?.trim() || "a MatchLever talent";
    const talentName = talentNameForInvite(user);

    const emailResults: {
      email: string;
      demo: boolean;
      inviteUrl: string;
      error?: string;
      skipped?: boolean;
    }[] = [];

    for (const ref of insertedRefs) {
      try {
        const sent = await sendReferenceInviteEmail({
          to: ref.reference_email,
          talentName,
          talentTitle,
          token: ref.verification_token,
        });
        emailResults.push({
          email: ref.reference_email,
          demo: sent.demo,
          inviteUrl: sent.inviteUrl,
          skipped: sent.skipped,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to send invite";
        console.error("[onboarding resend]", ref.reference_email, message);
        emailResults.push({
          email: ref.reference_email,
          demo: false,
          inviteUrl: "",
          error: message,
        });
      }
    }

    const failedEmails = emailResults.filter((r) => r.error);
    const demoEmails = emailResults.filter((r) => r.demo && !r.error);
    const skippedEmails = emailResults.filter((r) => r.skipped);
    const firstError = failedEmails[0]?.error;
    const warning =
      failedEmails.length > 0
        ? failedEmails.length === insertedRefs.length
          ? `Reference emails failed to send${firstError ? `: ${firstError}` : ""}. You can resend from the dashboard. Check RESEND_FROM_EMAIL uses a verified Resend domain.`
          : "Some reference emails failed — you can resend from the dashboard."
        : skippedEmails.length > 0
          ? "Some referrers have unsubscribed from automated MatchLever emails, so we didn't email them."
        : demoEmails.length > 0
          ? "Reference invites were saved but not emailed — RESEND_API_KEY is missing. Add it and use Resend Link on the dashboard."
          : undefined;

    // Profile + invites are already saved; never block onboarding completion on email delivery.
    return NextResponse.json({
      ok: true,
      talentId,
      referencesCreated: insertedRefs.length,
      emailsSent: emailResults.filter((r) => !r.error && !r.demo).length,
      emailResults,
      warning,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to complete onboarding";
    console.error("[/api/onboarding/complete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
