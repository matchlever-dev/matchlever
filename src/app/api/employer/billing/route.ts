import { NextResponse } from "next/server";
import { z } from "zod";

import type { EmployerBillingProfile } from "@/lib/employer/billing";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const bodySchema = z.object({
  apInvoicingEmail: z
    .union([z.string().email(), z.literal(""), z.null()])
    .transform((value) => (value ? value : null)),
  poNumber: z
    .union([z.string().trim().max(80), z.null()])
    .transform((value) => (value ? value : null)),
  paymentMethod: z
    .object({
      brand: z.string().trim().min(1).max(40),
      last4: z.string().regex(/^\d{4}$/),
      name: z.string().trim().max(120).nullable().optional(),
      expiry: z.string().optional(),
      cvc: z.string().optional(),
    })
    .nullable(),
});

function mapBilling(row: {
  created_at: string;
  free_matches_used: number | null;
  first_match_free_claimed: boolean;
  has_payment_method: boolean | null;
  ap_invoicing_email: string | null;
  po_number: string | null;
  stripe_payment_method_brand: string | null;
  stripe_payment_method_last4: string | null;
}): EmployerBillingProfile {
  return {
    createdAt: row.created_at,
    freeMatchesUsed: row.free_matches_used ?? 0,
    firstMatchFreeClaimed: row.first_match_free_claimed,
    hasPaymentMethod: Boolean(row.has_payment_method),
    apInvoicingEmail: row.ap_invoicing_email,
    poNumber: row.po_number,
    stripePaymentMethodBrand: row.stripe_payment_method_brand,
    stripePaymentMethodLast4: row.stripe_payment_method_last4,
  };
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      demo: true,
      billing: {
        createdAt: "2026-07-01T12:00:00.000Z",
        freeMatchesUsed: 0,
        firstMatchFreeClaimed: true,
        hasPaymentMethod: false,
        apInvoicingEmail: null,
        poNumber: null,
        stripePaymentMethodBrand: null,
        stripePaymentMethodLast4: null,
      } satisfies EmployerBillingProfile,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: employer, error } = await supabase
    .from("employer_profiles")
    .select(
      "created_at, free_matches_used, first_match_free_claimed, has_payment_method, ap_invoicing_email, po_number, stripe_payment_method_brand, stripe_payment_method_last4"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !employer) {
    return NextResponse.json(
      { error: "Employer profile not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ demo: false, billing: mapBilling(employer) });
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid billing payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      billing: {
        createdAt: "2026-07-01T12:00:00.000Z",
        freeMatchesUsed: 0,
        firstMatchFreeClaimed: true,
        hasPaymentMethod: Boolean(parsed.data.paymentMethod),
        apInvoicingEmail: parsed.data.apInvoicingEmail,
        poNumber: parsed.data.poNumber,
        stripePaymentMethodBrand: parsed.data.paymentMethod?.brand ?? null,
        stripePaymentMethodLast4: parsed.data.paymentMethod?.last4 ?? null,
      } satisfies EmployerBillingProfile,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update: {
    ap_invoicing_email: string | null;
    po_number: string | null;
    has_payment_method?: boolean;
    stripe_payment_method_brand?: string;
    stripe_payment_method_last4?: string;
  } = {
    ap_invoicing_email: parsed.data.apInvoicingEmail,
    po_number: parsed.data.poNumber,
  };

  if (parsed.data.paymentMethod) {
    // Stripe Elements will replace this mock path with PaymentMethod IDs.
    update.has_payment_method = true;
    update.stripe_payment_method_brand = parsed.data.paymentMethod.brand;
    update.stripe_payment_method_last4 = parsed.data.paymentMethod.last4;
  }

  const { data: employer, error } = await supabase
    .from("employer_profiles")
    .update(update)
    .eq("user_id", user.id)
    .select(
      "created_at, free_matches_used, first_match_free_claimed, has_payment_method, ap_invoicing_email, po_number, stripe_payment_method_brand, stripe_payment_method_last4"
    )
    .single();

  if (error || !employer) {
    console.error("[employer billing]", error?.message);
    return NextResponse.json(
      { error: "Unable to save billing details" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    demo: false,
    billing: mapBilling(employer),
  });
}
