"use client";

import { useState } from "react";

import type { EmployerBillingProfile } from "@/lib/employer/billing";
import {
  FOUNDER_PROMO_YEAR,
  MATCH_BUNDLE_PRICE_USD,
  employerSignupYear,
  isFounderPromoEligible,
} from "@/lib/employer/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BillingPanelProps = {
  billing: EmployerBillingProfile;
  onSaved: (next: Partial<EmployerBillingProfile>) => void;
};

export function EmployerBillingPanel({ billing, onSaved }: BillingPanelProps) {
  const [apEmail, setApEmail] = useState(billing.apInvoicingEmail ?? "");
  const [poNumber, setPoNumber] = useState(billing.poNumber ?? "");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const founderEligible = isFounderPromoEligible(billing);
  const signupYear = employerSignupYear(billing.createdAt);

  async function saveBilling(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/employer/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apInvoicingEmail: apEmail.trim() || null,
          poNumber: poNumber.trim() || null,
          // Mock Stripe Elements payload — server stores last4/brand only.
          paymentMethod: cardNumber.trim()
            ? {
                brand: "visa",
                last4: cardNumber.replace(/\D/g, "").slice(-4),
                name: cardName.trim() || null,
                expiry,
                cvc,
              }
            : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to save billing");
      onSaved(json.billing as Partial<EmployerBillingProfile>);
      setMessage(
        json.demo
          ? "Billing details saved (demo mode — Stripe not charged)."
          : "Billing details saved."
      );
      setCardNumber("");
      setCvc("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save billing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
      <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
        Billing
      </p>
      <h2 className="mt-2 font-display text-xl font-semibold text-[#2B5B84]">
        Payment method
      </h2>
      <p className="mt-2 text-sm text-[#5B616B]">
        Job posting and viewing incognito profiles are $0. You are charged $
        {MATCH_BUNDLE_PRICE_USD} only when you Accept Match (unlocks up to 5
        accepts per role).
        {founderEligible ? (
          <span className="mt-1 block font-medium text-[#E87A5D]">
            {FOUNDER_PROMO_YEAR} Founder Special: your first accepted match is
            $0.
          </span>
        ) : signupYear === FOUNDER_PROMO_YEAR ? (
          <span className="mt-1 block">Founder promo already used.</span>
        ) : null}
      </p>

      <div className="mt-4 rounded-md border border-[#2B5B84]/12 bg-[#F7F6F3] px-4 py-3 text-sm">
        {billing.hasPaymentMethod ? (
          <p>
            Card on file:{" "}
            <span className="font-medium capitalize">
              {billing.stripePaymentMethodBrand || "card"}
            </span>{" "}
            •••• {billing.stripePaymentMethodLast4 || "****"}
          </p>
        ) : (
          <p>No payment method on file yet.</p>
        )}
        <p className="mt-1 text-[#5B616B]">
          Free matches used: {billing.freeMatchesUsed}
        </p>
      </div>

      <form className="mt-6 space-y-5" onSubmit={(event) => void saveBilling(event)}>
        <div className="rounded-lg border border-dashed border-[#2B5B84]/25 bg-[#F7F6F3]/60 p-4">
          <p className="font-display text-[11px] font-semibold tracking-[0.16em] text-[#2B5B84] uppercase">
            Stripe Elements (scaffolded)
          </p>
          <p className="mt-1 text-xs text-[#5B616B]">
            Mock card fields until Stripe keys are wired. Nothing is charged on
            save.
          </p>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="card-name">Name on card</Label>
              <Input
                id="card-name"
                className="h-11"
                autoComplete="cc-name"
                value={cardName}
                onChange={(event) => setCardName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="card-number">Card number</Label>
              <Input
                id="card-number"
                className="h-11"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(event) => setCardNumber(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="card-exp">Expiry</Label>
                <Input
                  id="card-exp"
                  className="h-11"
                  placeholder="MM/YY"
                  autoComplete="cc-exp"
                  value={expiry}
                  onChange={(event) => setExpiry(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="card-cvc">CVC</Label>
                <Input
                  id="card-cvc"
                  className="h-11"
                  placeholder="123"
                  autoComplete="cc-csc"
                  value={cvc}
                  onChange={(event) => setCvc(event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ap-email">AP / Invoicing email (optional)</Label>
            <Input
              id="ap-email"
              type="email"
              className="h-11"
              value={apEmail}
              onChange={(event) => setApEmail(event.target.value)}
              placeholder="ap@company.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="po-number">PO number (optional)</Label>
            <Input
              id="po-number"
              className="h-11"
              value={poNumber}
              onChange={(event) => setPoNumber(event.target.value)}
              placeholder="PO-1042"
            />
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-[#2B5B84]" role="status">
            {message}
          </p>
        ) : null}

        <Button
          type="submit"
          className="h-11 bg-[#2B5B84] text-white hover:bg-[#244d70]"
          disabled={busy}
        >
          {busy ? "Saving…" : "Save billing details"}
        </Button>
      </form>
    </section>
  );
}
