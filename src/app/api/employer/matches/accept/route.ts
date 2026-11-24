import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  MATCH_BUNDLE_LIMIT,
  quoteAcceptMatch,
} from "@/lib/employer/billing";
import { markMatchBilling } from "@/lib/matching/billing";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const bodySchema = z.object({
  jobPostingId: z.string().uuid(),
  talentProfileId: z.string().uuid(),
  confirmCharge: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid accept-match payload" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    const quote = quoteAcceptMatch(
      {
        createdAt: "2026-07-01T12:00:00.000Z",
        freeMatchesUsed: 0,
      },
      { acceptedMatchCount: 0, matchBundlePurchasedAt: null }
    );
    return NextResponse.json({
      ok: true,
      demo: true,
      quote,
      toast: quote.message,
      contactUnlocked: true,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select(
      "id, created_at, free_matches_used, first_match_free_claimed, has_payment_method"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!employer) {
    return NextResponse.json(
      { error: "Employer profile not found" },
      { status: 404 }
    );
  }

  const { data: job } = await supabase
    .from("job_postings")
    .select(
      "id, status, accepted_match_count, match_bundle_purchased_at, employer_profile_id"
    )
    .eq("id", parsed.data.jobPostingId)
    .eq("employer_profile_id", employer.id)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: "Job opening not found" }, { status: 404 });
  }

  if (job.status !== "active") {
    return NextResponse.json(
      { error: "Only active job openings can accept matches" },
      { status: 400 }
    );
  }

  const quote = quoteAcceptMatch(
    {
      createdAt: employer.created_at,
      freeMatchesUsed: employer.free_matches_used ?? 0,
    },
    {
      acceptedMatchCount: job.accepted_match_count ?? 0,
      matchBundlePurchasedAt: job.match_bundle_purchased_at,
    }
  );

  if (quote.chargeUsd > 0 && !employer.has_payment_method) {
    return NextResponse.json(
      {
        error: "Add a payment method in Billing before accepting a paid match.",
        code: "PAYMENT_METHOD_REQUIRED",
        quote,
      },
      { status: 402 }
    );
  }

  if (quote.chargeUsd > 0 && !parsed.data.confirmCharge) {
    return NextResponse.json({
      ok: false,
      requiresConfirmation: true,
      quote,
    });
  }

  // Stripe charge is mocked until Elements + PaymentIntents are wired.
  const charged = quote.chargeUsd > 0;
  const currentAccepted = job.accepted_match_count ?? 0;
  const nextAccepted =
    quote.reason === "standard_bundle" && currentAccepted >= MATCH_BUNDLE_LIMIT
      ? 1
      : currentAccepted + 1;

  const jobUpdate: {
    accepted_match_count: number;
    match_bundle_purchased_at?: string;
  } = {
    accepted_match_count: nextAccepted,
  };
  if (quote.reason === "standard_bundle") {
    jobUpdate.match_bundle_purchased_at = new Date().toISOString();
  }

  const { error: jobError } = await supabase
    .from("job_postings")
    .update(jobUpdate)
    .eq("id", job.id);
  if (jobError) {
    console.error("[accept match job]", jobError.message);
    return NextResponse.json({ error: "Unable to accept match" }, { status: 500 });
  }

  if (quote.reason === "founder_2026") {
    const { error: employerError } = await supabase
      .from("employer_profiles")
      .update({
        free_matches_used: (employer.free_matches_used ?? 0) + 1,
        first_match_free_claimed: true,
      })
      .eq("id", employer.id);
    if (employerError) {
      console.error("[accept match employer]", employerError.message);
    }
  }

  const now = new Date().toISOString();
  const notes = charged
    ? `Accepted match · charged $${quote.chargeUsd}`
    : `Accepted match · ${quote.reason}`;

  const { data: existing } = await supabase
    .from("match_handshakes")
    .select("id, accepted_at")
    .eq("job_posting_id", job.id)
    .eq("talent_profile_id", parsed.data.talentProfileId)
    .maybeSingle();

  let handshakeId: string | null = existing?.id ?? null;

  if (existing) {
    const { error: handshakeError } = await supabase
      .from("match_handshakes")
      .update({
        employer_response: "accepted",
        accepted_at: existing.accepted_at ?? now,
        passed_at: null,
        kanban_column: "screening",
        notes,
      })
      .eq("id", existing.id);
    if (handshakeError) {
      console.error("[accept match handshake]", handshakeError.message);
    }
  } else {
    const { count } = await supabase
      .from("match_handshakes")
      .select("id", { count: "exact", head: true })
      .eq("job_posting_id", job.id);
    const billing = markMatchBilling((count ?? 0) + 1);
    const { data: handshake, error: handshakeError } = await supabase
      .from("match_handshakes")
      .insert({
        job_posting_id: job.id,
        talent_profile_id: parsed.data.talentProfileId,
        kanban_column: "screening",
        is_manual_match: false,
        match_source: "manual",
        matched_by: user.id,
        notes,
        match_index: billing.matchIndex,
        billing_status: billing.billingStatus,
        invoice_cycle: billing.invoiceCycle,
        accept_token: randomBytes(24).toString("hex"),
        employer_response: "accepted",
        accepted_at: now,
        passed_at: null,
      })
      .select("id")
      .maybeSingle();

    if (handshakeError) {
      console.error("[accept match handshake]", handshakeError.message);
    }
    handshakeId = handshake?.id ?? null;
  }

  return NextResponse.json({
    ok: true,
    demo: false,
    quote,
    chargedUsd: quote.chargeUsd,
    toast: quote.message,
    contactUnlocked: true,
    handshakeId,
  });
}
