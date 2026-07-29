import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sendReferenceInviteEmail } from "@/lib/email/resend";
import { linkedInUrlSchema } from "@/lib/reference/schema";
import {
  REFERRER_LINKEDIN_INVALID_MESSAGE,
  validateReferrerLinkedIn,
} from "@/lib/reference/linkedin-validation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

const bodySchema = z
  .object({
    referenceId: z.string().min(1),
    email: z.string().trim().email("Enter a valid email").optional(),
    linkedInUrl: linkedInUrlSchema.optional(),
  })
  .refine((data) => Boolean(data.email || data.linkedInUrl), {
    message: "Provide an email and/or LinkedIn URL to update",
  });

function newVerificationToken() {
  return randomBytes(24).toString("hex");
}

export async function PATCH(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const nextEmail = parsed.data.email?.trim().toLowerCase();
    let nextLinkedIn = parsed.data.linkedInUrl?.trim();
    let linkedInFlags: string[] | null = null;

    if (nextLinkedIn) {
      const validation = await validateReferrerLinkedIn(nextLinkedIn);
      if (!validation.valid) {
        console.info("[references linkedin invalid]", {
          referenceId: parsed.data.referenceId,
          mode: validation.mode,
          checks: validation.checks,
          flags: validation.flags,
        });
        return NextResponse.json(
          { error: REFERRER_LINKEDIN_INVALID_MESSAGE },
          { status: 400 }
        );
      }
      nextLinkedIn = validation.normalizedUrl;
      linkedInFlags = [
        "seeker_provided_linkedin",
        `validation_mode:${validation.mode}`,
        ...validation.flags,
      ];
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        ok: true,
        demo: true,
        reference_email: nextEmail,
        reference_linkedin_url: nextLinkedIn,
        message: "Demo: reference updated (configure Supabase to persist).",
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("candidate_profiles")
      .select("id, headline")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "Candidate profile not found" },
        { status: 404 }
      );
    }

    const { data: reference, error } = await supabase
      .from("candidate_references")
      .select(
        "id, reference_email, reference_linkedin_url, verification_token, status, candidate_profile_id, authenticity_flags"
      )
      .eq("id", parsed.data.referenceId)
      .eq("candidate_profile_id", profile.id)
      .maybeSingle();

    if (error || !reference) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }

    if (reference.status === "verified") {
      return NextResponse.json(
        { error: "Verified references cannot be edited" },
        { status: 409 }
      );
    }

    const emailChanged =
      Boolean(nextEmail) &&
      nextEmail !== reference.reference_email.toLowerCase();
    const linkedInChanged =
      Boolean(nextLinkedIn) &&
      nextLinkedIn !== (reference.reference_linkedin_url || "");

    if (!emailChanged && !linkedInChanged) {
      return NextResponse.json({
        ok: true,
        reference_email: reference.reference_email,
        reference_linkedin_url: reference.reference_linkedin_url,
        unchanged: true,
      });
    }

    if (emailChanged && nextEmail) {
      const { data: duplicate } = await supabase
        .from("candidate_references")
        .select("id")
        .eq("candidate_profile_id", profile.id)
        .eq("reference_email", nextEmail)
        .neq("id", reference.id)
        .maybeSingle();

      if (duplicate) {
        return NextResponse.json(
          { error: "That email is already used for another reference" },
          { status: 409 }
        );
      }
    }

    if (linkedInChanged && nextLinkedIn) {
      const { data: duplicates } = await supabase
        .from("candidate_references")
        .select("id, reference_linkedin_url")
        .eq("candidate_profile_id", profile.id)
        .neq("id", reference.id);

      const clash = (duplicates ?? []).some((row) => {
        const existing = row.reference_linkedin_url;
        if (!existing) return false;
        try {
          return (
            new URL(existing).pathname.replace(/\/+$/, "").toLowerCase() ===
            new URL(nextLinkedIn).pathname.replace(/\/+$/, "").toLowerCase()
          );
        } catch {
          return false;
        }
      });

      if (clash) {
        return NextResponse.json(
          { error: "That LinkedIn profile is already used for another reference" },
          { status: 409 }
        );
      }
    }

    const token = emailChanged
      ? newVerificationToken()
      : reference.verification_token;

    const updatePayload: {
      reference_email?: string;
      reference_linkedin_url?: string;
      verification_token?: string;
      authenticity_flags?: Json;
    } = {};

    if (emailChanged && nextEmail) {
      updatePayload.reference_email = nextEmail;
      updatePayload.verification_token = token;
    }
    if (linkedInChanged && nextLinkedIn) {
      updatePayload.reference_linkedin_url = nextLinkedIn;
      if (linkedInFlags) {
        updatePayload.authenticity_flags = linkedInFlags as Json;
      }
    }

    const { error: updateError } = await supabase
      .from("candidate_references")
      .update(updatePayload)
      .eq("id", reference.id)
      .eq("candidate_profile_id", profile.id);

    if (updateError) {
      console.error("[references update]", updateError.message);
      return NextResponse.json(
        { error: "Unable to update reference" },
        { status: 500 }
      );
    }

    let invite:
      | { demo: boolean; inviteUrl: string; id?: string }
      | { error: string }
      | null = null;

    if (emailChanged && nextEmail) {
      try {
        const sent = await sendReferenceInviteEmail({
          to: nextEmail,
          candidateTitle: profile.headline || "MatchLever candidate",
          token,
        });
        invite = sent;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to send invite";
        console.error("[references email invite]", nextEmail, message);
        invite = { error: message };
      }
    }

    return NextResponse.json({
      ok: true,
      reference_email: nextEmail ?? reference.reference_email,
      reference_linkedin_url:
        nextLinkedIn ?? reference.reference_linkedin_url,
      inviteSent: Boolean(invite && !("error" in invite)),
      invite,
      warning:
        invite && "error" in invite
          ? `Saved, but invite failed to send: ${invite.error}`
          : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update reference";
    console.error("[/api/dashboard/seeker/references]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
