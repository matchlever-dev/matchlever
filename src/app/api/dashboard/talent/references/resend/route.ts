import { NextResponse } from "next/server";
import { z } from "zod";

import { talentNameForInvite } from "@/lib/auth/display-name";
import { sendReferenceInviteEmail } from "@/lib/email/resend";
import { UNSUBSCRIBED_EMAIL_MESSAGE } from "@/lib/email/unsubscribe";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  referenceId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      const result = await sendReferenceInviteEmail({
        to: "demo@example.com",
        talentName: "Sam Patel",
        talentTitle: "Staff Platform Engineer",
        token: "demo-token-ref-three-cccc",
      });
      if (result.skipped) {
        return NextResponse.json(
          { error: UNSUBSCRIBED_EMAIL_MESSAGE },
          { status: 409 }
        );
      }
      return NextResponse.json({
        ok: true,
        ...result,
        demo: true,
        message: "Demo resend logged (configure Resend + Supabase to send).",
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: profile }, { data: userProfile }] = await Promise.all([
      supabase
        .from("talent_profiles")
        .select("id, headline")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    if (!profile) {
      return NextResponse.json(
        { error: "Talent profile not found" },
        { status: 404 }
      );
    }

    const { data: reference, error } = await supabase
      .from("talent_references")
      .select("id, reference_email, verification_token, status, talent_profile_id")
      .eq("id", parsed.data.referenceId)
      .eq("talent_profile_id", profile.id)
      .maybeSingle();

    if (error || !reference) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }

    if (reference.status === "verified") {
      return NextResponse.json(
        { error: "Reference already verified" },
        { status: 409 }
      );
    }

    const result = await sendReferenceInviteEmail({
      to: reference.reference_email,
      talentName: talentNameForInvite(user, userProfile?.full_name),
      talentTitle: profile.headline || "MatchLever talent",
      token: reference.verification_token,
    });

    if (result.skipped) {
      return NextResponse.json(
        { error: UNSUBSCRIBED_EMAIL_MESSAGE },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to resend link";
    console.error("[/api/dashboard/talent/references/resend]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
