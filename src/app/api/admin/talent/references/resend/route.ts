import { NextResponse } from "next/server";
import { z } from "zod";

import { DEMO_ADMIN_TALENT } from "@/lib/admin/demo";
import { requireAdminApi } from "@/lib/auth/api-guards";
import { talentNameForInvite } from "@/lib/auth/display-name";
import { sendReferenceInviteEmail } from "@/lib/email/resend";
import { UNSUBSCRIBED_EMAIL_MESSAGE } from "@/lib/email/unsubscribe";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  referenceId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi();
    if (!auth.ok) return auth.response;

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (auth.actor.demo) {
      const demoMatch = DEMO_ADMIN_TALENT.flatMap((talent) =>
        talent.references.map((reference) => ({ talent, reference }))
      ).find(({ reference }) => reference.id === parsed.data.referenceId);

      if (!demoMatch) {
        return NextResponse.json(
          { error: "Reference not found" },
          { status: 404 }
        );
      }

      if (demoMatch.reference.status === "verified") {
        return NextResponse.json(
          { error: "Reference already verified" },
          { status: 409 }
        );
      }

      const result = await sendReferenceInviteEmail({
        to: demoMatch.reference.reference_email,
        talentName: talentNameForInvite(
          null,
          demoMatch.talent.full_name
        ),
        talentTitle:
          demoMatch.talent.headline || "MatchLever talent",
        token: `demo-token-${demoMatch.reference.id}`,
        reminder: true,
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
        message: "Demo reminder logged (configure Resend + Supabase to send).",
      });
    }

    const supabase = await createClient();
    const { data: reference, error: referenceError } = await supabase
      .from("talent_references")
      .select(
        "id, reference_email, verification_token, status, talent_profile_id"
      )
      .eq("id", parsed.data.referenceId)
      .maybeSingle();

    if (referenceError || !reference) {
      return NextResponse.json(
        { error: "Reference not found" },
        { status: 404 }
      );
    }

    if (reference.status === "verified") {
      return NextResponse.json(
        { error: "Reference already verified" },
        { status: 409 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("talent_profiles")
      .select("id, user_id, headline")
      .eq("id", reference.talent_profile_id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Talent profile not found" },
        { status: 404 }
      );
    }

    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", profile.user_id)
      .maybeSingle();

    const result = await sendReferenceInviteEmail({
      to: reference.reference_email,
      talentName: talentNameForInvite(null, userProfile?.full_name),
      talentTitle: profile.headline || "MatchLever talent",
      token: reference.verification_token,
      reminder: true,
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
      error instanceof Error ? error.message : "Unable to resend reminder";
    console.error("[/api/admin/talent/references/resend]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
