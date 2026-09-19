export const MATCH_BUNDLE_PRICE_USD = 600;
export const MATCH_BUNDLE_LIMIT = 5;
export const FOUNDER_PROMO_YEAR = 2026;

export type EmployerBillingProfile = {
  createdAt: string;
  freeMatchesUsed: number;
  firstMatchFreeClaimed: boolean;
  hasPaymentMethod: boolean;
  apInvoicingEmail: string | null;
  poNumber: string | null;
  stripePaymentMethodBrand: string | null;
  stripePaymentMethodLast4: string | null;
};

export type JobBillingState = {
  acceptedMatchCount: number;
  matchBundlePurchasedAt: string | null;
};

export type AcceptMatchQuote =
  | {
      chargeUsd: 0;
      reason: "founder_2026" | "bundle_remaining";
      message: string;
    }
  | {
      chargeUsd: typeof MATCH_BUNDLE_PRICE_USD;
      reason: "standard_bundle";
      message: string;
    };

export function employerSignupYear(createdAt: string): number {
  const year = new Date(createdAt).getUTCFullYear();
  return Number.isFinite(year) ? year : 0;
}

export function isFounderPromoEligible(
  billing: Pick<EmployerBillingProfile, "createdAt" | "freeMatchesUsed">
): boolean {
  return (
    employerSignupYear(billing.createdAt) === FOUNDER_PROMO_YEAR &&
    billing.freeMatchesUsed < 1
  );
}

export function quoteAcceptMatch(
  employer: Pick<EmployerBillingProfile, "createdAt" | "freeMatchesUsed">,
  job: JobBillingState
): AcceptMatchQuote {
  if (isFounderPromoEligible(employer)) {
    return {
      chargeUsd: 0,
      reason: "founder_2026",
      message:
        "2026 Founder Special applied — your first accepted match is $0.",
    };
  }

  const bundleActive =
    Boolean(job.matchBundlePurchasedAt) &&
    job.acceptedMatchCount > 0 &&
    job.acceptedMatchCount < MATCH_BUNDLE_LIMIT;

  if (bundleActive) {
    return {
      chargeUsd: 0,
      reason: "bundle_remaining",
      message: `Included in your current unlock (${job.acceptedMatchCount}/${MATCH_BUNDLE_LIMIT} matches used).`,
    };
  }

  return {
    chargeUsd: MATCH_BUNDLE_PRICE_USD,
    reason: "standard_bundle",
    message: `Charging $${MATCH_BUNDLE_PRICE_USD} unlocks this candidate and up to ${MATCH_BUNDLE_LIMIT} accepted matches for this role.`,
  };
}

export function founderPromoBannerCopy(
  billing: Pick<EmployerBillingProfile, "createdAt" | "freeMatchesUsed">
): string | null {
  if (!isFounderPromoEligible(billing)) return null;
  return "2026 Founder Special: Your first accepted match is $0!";
}
