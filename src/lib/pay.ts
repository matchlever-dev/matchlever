export const PAY_TYPE_VALUES = ["annual", "hourly"] as const;
export type PayType = (typeof PAY_TYPE_VALUES)[number];

export const DEFAULT_ANNUAL_PAY = 140_000;
export const DEFAULT_HOURLY_PAY = 70;

export function isPayType(value: unknown): value is PayType {
  return value === "annual" || value === "hourly";
}

export function defaultPayAmount(payType: PayType): number {
  return payType === "hourly" ? DEFAULT_HOURLY_PAY : DEFAULT_ANNUAL_PAY;
}

/** When switching annual ↔ hourly, remap implausible amounts to defaults. */
export function coercePayAmountForType(
  amount: number | null | undefined,
  payType: PayType
): number {
  const value =
    typeof amount === "number" && Number.isFinite(amount) ? amount : null;
  if (payType === "hourly") {
    if (value == null || value <= 0 || value > 10_000) {
      return DEFAULT_HOURLY_PAY;
    }
    return Math.round(value);
  }
  if (value == null || value <= 0 || value < 1_000) {
    return DEFAULT_ANNUAL_PAY;
  }
  return Math.round(value);
}

export function formatPayAmount(
  amount: number | null | undefined,
  payType: PayType | null | undefined = "annual"
): string {
  if (amount == null) return "Pay TBD";
  const type = payType === "hourly" ? "hourly" : "annual";
  const formatted = `$${amount.toLocaleString("en-US")}`;
  return type === "hourly" ? `${formatted}/hr` : `${formatted}/yr`;
}

export function payAmountLabel(payType: PayType): string {
  return payType === "hourly" ? "Hourly rate (USD)" : "Annual salary (USD)";
}
