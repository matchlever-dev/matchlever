import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import {
  candidateNameForInvite,
  displayNameFromAuthUser,
} from "@/lib/auth/display-name";
import { linkedinUrlFromAuthUser } from "@/lib/auth/linkedin-url";
import { sendReferenceInviteEmail } from "@/lib/email/resend";
import { onboardingFormSchema, resolveOnboardingCity } from "@/lib/onboarding/form-schema";
import { TIMEZONE_OPTIONS } from "@/lib/onboarding/schema";
import {
  REFERRER_LINKEDIN_INVALID_MESSAGE,
  validateReferrerLinkedIn,
} from "@/lib/reference/linkedin-validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function timezoneOffsetMinutes(timezone: string): number | null {
  return (
    TIMEZONE_OPTIONS.find((tz) => tz.value === timezone)?.offsetMinutes ?? null
  );
}

function normalizeTime(value: string): string {
  // Accept "HH:MM" or "HH:MM:SS" → Postgres time
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value;
}

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
          "seeker_provided_linkedin",
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
        { error: "Sign in with LinkedIn before completing onboarding." },
        { status: 401 }
      );
    }

    // Ensure app profile row exists (auth trigger normally creates it).
    const fullName = displayNameFromAuthUser(user);
    const avatarUrl =
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null;
    const linkedInUrl = linkedinUrlFromAuthUser(user);

    const { data: existingUserProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existingUserProfile) {
      const { error: profileUpdateError } = await supabase
        .from("user_profiles")
        .update({
          email: user.email ?? null,
          full_name: fullName,
          avatar_url: avatarUrl,
          role: "candidate",
          ...(linkedInUrl ? { linkedin_url: linkedInUrl } : {}),
        })
        .eq("id", user.id);
      if (profileUpdateError) {
        console.error("[onboarding user_profiles]", profileUpdateError.message);
        return NextResponse.json(
          { error: "Unable to save user profile" },
          { status: 500 }
        );
      }
    } else {
      const admin = createAdminClient();
      if (!admin) {
        return NextResponse.json(
          {
            error:
              "User profile missing and service role is not configured. Re-sign in or set SUPABASE_SERVICE_ROLE_KEY.",
          },
          { status: 500 }
        );
      }
      const { error: profileInsertError } = await admin
        .from("user_profiles")
        .insert({
          id: user.id,
          email: user.email ?? null,
          full_name: fullName,
          avatar_url: avatarUrl,
          role: "candidate",
          linkedin_url: linkedInUrl,
        });
      if (profileInsertError) {
        console.error("[onboarding user_profiles insert]", profileInsertError.message);
        return NextResponse.json(
          { error: "Unable to create user profile" },
          { status: 500 }
        );
      }
    }

    const orderedModes = (["remote", "hybrid", "onsite"] as const).filter(
      (mode) => data.locationModes.includes(mode)
    );
    const needsLocal =
      orderedModes.includes("hybrid") || orderedModes.includes("onsite");
    const resolvedCity = resolveOnboardingCity(data);

    const candidatePayload = {
      user_id: user.id,
      headline: data.anonymousTitle?.trim() || "MatchLever Candidate",
      sanitized_summary: data.sanitizedSummary?.trim() || null,
      raw_resume_text: data.rawResumeText?.trim() || null,
      verified_skills: data.verifiedSkills,
      suggested_taglines: data.suggestedTaglines.map((t) => t.trim()),
      selected_tagline: data.selectedTagline.trim(),
      global_city: resolvedCity,
      global_country: data.globalCountry,
      timezone_offset: timezoneOffsetMinutes(data.timezone),
      work_hours_start: normalizeTime(data.workHoursStart),
      work_hours_end: normalizeTime(data.workHoursEnd),
      location_modes: orderedModes,
      location_mode: orderedModes[0],
      max_commute_miles: needsLocal ? data.maxCommuteMiles : null,
      open_to_relocation: needsLocal ? data.openToRelocation : null,
      min_salary: data.minSalary,
      visa_status: data.visaStatus,
      years_experience: data.yearsExperience ?? null,
      seeker_tos_accepted_at: new Date().toISOString(),
      // Hidden until all three references are verified.
      status: "on_hold",
    };

    const { data: existingCandidate } = await supabase
      .from("candidate_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let candidateId = existingCandidate?.id ?? null;

    if (candidateId) {
      const { error: updateError } = await supabase
        .from("candidate_profiles")
        .update(candidatePayload)
        .eq("id", candidateId);
      if (updateError) {
        console.error("[onboarding candidate update]", updateError.message);
        return NextResponse.json(
          { error: "Unable to update candidate profile" },
          { status: 500 }
        );
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("candidate_profiles")
        .insert(candidatePayload)
        .select("id")
        .single();
      if (insertError || !inserted) {
        console.error("[onboarding candidate insert]", insertError?.message);
        return NextResponse.json(
          { error: "Unable to create candidate profile" },
          { status: 500 }
        );
      }
      candidateId = inserted.id;
    }

    // Replace reference invites on (re)completion.
    const { error: deleteRefsError } = await supabase
      .from("candidate_references")
      .delete()
      .eq("candidate_profile_id", candidateId);

    if (deleteRefsError) {
      console.error("[onboarding refs delete]", deleteRefsError.message);
      return NextResponse.json(
        { error: "Unable to reset references" },
        { status: 500 }
      );
    }

    const referenceRows = validatedRefs.map((ref) => ({
      candidate_profile_id: candidateId!,
      reference_email: ref.email,
      reference_linkedin_url: ref.linkedInUrl,
      relationship: ref.relationship,
      status: "pending",
      verification_token: newVerificationToken(),
      authenticity_flags: ref.flags,
    }));

    const { data: insertedRefs, error: insertRefsError } = await supabase
      .from("candidate_references")
      .insert(referenceRows)
      .select("id, reference_email, verification_token");

    if (insertRefsError || !insertedRefs) {
      console.error("[onboarding refs insert]", insertRefsError?.message);
      return NextResponse.json(
        { error: "Unable to create reference invites" },
        { status: 500 }
      );
    }

    const candidateTitle =
      data.anonymousTitle?.trim() || "a MatchLever candidate";
    const candidateName = candidateNameForInvite(user, fullName);

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
          candidateName,
          candidateTitle,
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
      candidateId,
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
