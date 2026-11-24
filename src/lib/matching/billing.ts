/** Per job opening: 1st match free; matches 2–7 invoiced (one payment covers seven). */

export const MATCHES_PER_INVOICE_CYCLE = 7;

export type MatchBillingStatus = "free" | "invoiced";

export type MatchBillingMark = {
  matchIndex: number;
  billingStatus: MatchBillingStatus;
  invoiceCycle: number;
  /** Position within the 7-match cycle (1–7). */
  cyclePosition: number;
};

/** 1-based match index → free / invoiced mark for a job opening. */
export function markMatchBilling(matchIndex: number): MatchBillingMark {
  if (!Number.isInteger(matchIndex) || matchIndex < 1) {
    throw new Error("matchIndex must be a positive integer");
  }
  const invoiceCycle = Math.floor((matchIndex - 1) / MATCHES_PER_INVOICE_CYCLE) + 1;
  const cyclePosition = ((matchIndex - 1) % MATCHES_PER_INVOICE_CYCLE) + 1;
  return {
    matchIndex,
    billingStatus: cyclePosition === 1 ? "free" : "invoiced",
    invoiceCycle,
    cyclePosition,
  };
}

export function matchBillingLabel(status: MatchBillingStatus): string {
  return status === "free" ? "Free" : "Invoiced";
}
