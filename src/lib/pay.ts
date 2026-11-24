import { z } from "zod";

export const PAY_TYPE_VALUES = ["annual", "hourly"] as const;
export type PayType = (typeof PAY_TYPE_VALUES)[number];

export const DEFAULT_ANNUAL_PAY = 140_000;
export const DEFAULT_HOURLY_PAY = 70;

/** Full-time hours/year used only when converting across denominations for matching. */
export const PAY_HOURS_PER_YEAR = 2080;

export type TalentPayRequirement = {
  payAnnualMin: number | null;
  payAnnualMax: number | null;
  payHourlyMin: number | null;
  payHourlyMax: number | null;
};

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

export function formatPayRange(
  min: number | null | undefined,
  max: number | null | undefined,
  payType: PayType
): string | null {
  if (min == null && max == null) return null;
  const suffix = payType === "hourly" ? "/hr" : "/yr";
  const fmt = (n: number) => `$${n.toLocaleString("en-US")}${suffix}`;
  if (min != null && max != null) {
    if (min === max) return fmt(min);
    return `${fmt(min)} – ${fmt(max)}`;
  }
  if (min != null) return `${fmt(min)}+`;
  return `up to ${fmt(max!)}`;
}

/** Compact talent requirement summary for emails / cards. */
export function formatTalentPayRequirement(
  req: TalentPayRequirement
): string | null {
  const parts = [
    formatPayRange(req.payAnnualMin, req.payAnnualMax, "annual"),
    formatPayRange(req.payHourlyMin, req.payHourlyMax, "hourly"),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function positiveIntOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

/** Normalize form/API pay requirement fields. */
export function normalizeTalentPayRequirement(input: {
  payAnnualMin?: number | null;
  payAnnualMax?: number | null;
  payHourlyMin?: number | null;
  payHourlyMax?: number | null;
  /** When true, omit empty denomination entirely. */
  wantAnnual?: boolean;
  wantHourly?: boolean;
}): TalentPayRequirement {
  const wantAnnual = input.wantAnnual !== false;
  const wantHourly = input.wantHourly !== false;

  let payAnnualMin = wantAnnual ? positiveIntOrNull(input.payAnnualMin) : null;
  let payAnnualMax = wantAnnual ? positiveIntOrNull(input.payAnnualMax) : null;
  let payHourlyMin = wantHourly ? positiveIntOrNull(input.payHourlyMin) : null;
  let payHourlyMax = wantHourly ? positiveIntOrNull(input.payHourlyMax) : null;

  if (payAnnualMin == null && payAnnualMax != null) {
    payAnnualMin = payAnnualMax;
  }
  if (payHourlyMin == null && payHourlyMax != null) {
    payHourlyMin = payHourlyMax;
  }
  if (
    payAnnualMin != null &&
    payAnnualMax != null &&
    payAnnualMax < payAnnualMin
  ) {
    payAnnualMax = payAnnualMin;
  }
  if (
    payHourlyMin != null &&
    payHourlyMax != null &&
    payHourlyMax < payHourlyMin
  ) {
    payHourlyMax = payHourlyMin;
  }

  return { payAnnualMin, payAnnualMax, payHourlyMin, payHourlyMax };
}

/**
 * Legacy mirrors for talent_profiles.pay_type + min_salary.
 * Prefer annual when set; otherwise hourly.
 */
export function legacyPayMirrorFromRequirement(req: TalentPayRequirement): {
  payType: PayType;
  minSalary: number | null;
} {
  if (req.payAnnualMin != null) {
    return { payType: "annual", minSalary: req.payAnnualMin };
  }
  if (req.payHourlyMin != null) {
    return { payType: "hourly", minSalary: req.payHourlyMin };
  }
  return { payType: "annual", minSalary: null };
}

/** DB / API row → talent pay requirement (supports legacy-only rows). */
export function talentPayRequirementFromRow(row: {
  pay_annual_min?: number | null;
  pay_annual_max?: number | null;
  pay_hourly_min?: number | null;
  pay_hourly_max?: number | null;
  pay_type?: string | null;
  min_salary?: number | null;
}): TalentPayRequirement {
  let payAnnualMin = positiveIntOrNull(row.pay_annual_min);
  let payAnnualMax = positiveIntOrNull(row.pay_annual_max);
  let payHourlyMin = positiveIntOrNull(row.pay_hourly_min);
  let payHourlyMax = positiveIntOrNull(row.pay_hourly_max);

  const hasRange =
    payAnnualMin != null ||
    payAnnualMax != null ||
    payHourlyMin != null ||
    payHourlyMax != null;

  if (!hasRange && row.min_salary != null && row.min_salary > 0) {
    if (row.pay_type === "hourly") {
      payHourlyMin = Math.round(row.min_salary);
    } else {
      payAnnualMin = Math.round(row.min_salary);
    }
  }

  return { payAnnualMin, payAnnualMax, payHourlyMin, payHourlyMax };
}

export function talentPayRequirementToDb(req: TalentPayRequirement): {
  pay_annual_min: number | null;
  pay_annual_max: number | null;
  pay_hourly_min: number | null;
  pay_hourly_max: number | null;
  pay_type: PayType;
  min_salary: number | null;
} {
  const mirror = legacyPayMirrorFromRequirement(req);
  return {
    pay_annual_min: req.payAnnualMin,
    pay_annual_max: req.payAnnualMax,
    pay_hourly_min: req.payHourlyMin,
    pay_hourly_max: req.payHourlyMax,
    pay_type: mirror.payType,
    min_salary: mirror.minSalary,
  };
}

/** Coerce RHF empty/NaN number inputs to null before zod number checks. */
export function coerceOptionalPayAmount(
  value: unknown
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number" && Number.isNaN(value)) return null;
  if (typeof value === "number") return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

const optionalAmountField = z
  .number()
  .int("Use a whole-dollar amount")
  .positive("Pay must be greater than zero")
  .nullable()
  .optional();

/** Shared zod shape for talent pay requirements (onboarding + profile edit). */
export const talentPayRequirementFieldsSchema = z.object({
  wantAnnual: z.boolean(),
  wantHourly: z.boolean(),
  payAnnualMin: optionalAmountField,
  payAnnualMax: optionalAmountField,
  payHourlyMin: optionalAmountField,
  payHourlyMax: optionalAmountField,
});

export function refineTalentPayRequirement(
  data: z.infer<typeof talentPayRequirementFieldsSchema>,
  ctx: z.RefinementCtx
) {
  if (!data.wantAnnual && !data.wantHourly) {
    ctx.addIssue({
      code: "custom",
      message: "Set an annual and/or hourly pay requirement",
      path: ["wantAnnual"],
    });
    return;
  }

  if (data.wantAnnual) {
    if (
      data.payAnnualMin == null ||
      !Number.isFinite(data.payAnnualMin) ||
      !Number.isInteger(data.payAnnualMin) ||
      data.payAnnualMin <= 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a minimum annual salary",
        path: ["payAnnualMin"],
      });
    }
    if (
      data.payAnnualMax != null &&
      (!Number.isFinite(data.payAnnualMax) ||
        !Number.isInteger(data.payAnnualMax) ||
        data.payAnnualMax <= 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Use a whole-dollar amount",
        path: ["payAnnualMax"],
      });
    } else if (
      data.payAnnualMax != null &&
      data.payAnnualMin != null &&
      data.payAnnualMax < data.payAnnualMin
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Max must be at least the minimum",
        path: ["payAnnualMax"],
      });
    }
  }

  if (data.wantHourly) {
    if (
      data.payHourlyMin == null ||
      !Number.isFinite(data.payHourlyMin) ||
      !Number.isInteger(data.payHourlyMin) ||
      data.payHourlyMin <= 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a minimum hourly rate",
        path: ["payHourlyMin"],
      });
    }
    if (
      data.payHourlyMax != null &&
      (!Number.isFinite(data.payHourlyMax) ||
        !Number.isInteger(data.payHourlyMax) ||
        data.payHourlyMax <= 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Use a whole-dollar amount",
        path: ["payHourlyMax"],
      });
    } else if (
      data.payHourlyMax != null &&
      data.payHourlyMin != null &&
      data.payHourlyMax < data.payHourlyMin
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Max must be at least the minimum",
        path: ["payHourlyMax"],
      });
    }
  }
}

export function annualizePayAmount(
  amount: number | null | undefined,
  payType: PayType | string | null | undefined
): number | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;
  if (payType === "hourly") return Math.round(amount * PAY_HOURS_PER_YEAR);
  return Math.round(amount);
}

export function deannualizeToHourly(annual: number): number {
  return Math.max(1, Math.round(annual / PAY_HOURS_PER_YEAR));
}

/**
 * Resolve talent min/max in the job's denomination for hard-fit scoring.
 * Prefers the matching denomination; falls back to converting the other.
 */
export function talentPayRangeForJobType(
  req: TalentPayRequirement,
  jobPayType: PayType | string | null | undefined
): { min: number | null; max: number | null; source: "native" | "converted" | "none" } {
  const hourly = jobPayType === "hourly";

  if (hourly) {
    if (req.payHourlyMin != null) {
      return {
        min: req.payHourlyMin,
        max: req.payHourlyMax,
        source: "native",
      };
    }
    if (req.payAnnualMin != null) {
      return {
        min: deannualizeToHourly(req.payAnnualMin),
        max:
          req.payAnnualMax != null
            ? deannualizeToHourly(req.payAnnualMax)
            : null,
        source: "converted",
      };
    }
    return { min: null, max: null, source: "none" };
  }

  if (req.payAnnualMin != null) {
    return {
      min: req.payAnnualMin,
      max: req.payAnnualMax,
      source: "native",
    };
  }
  if (req.payHourlyMin != null) {
    return {
      min: Math.round(req.payHourlyMin * PAY_HOURS_PER_YEAR),
      max:
        req.payHourlyMax != null
          ? Math.round(req.payHourlyMax * PAY_HOURS_PER_YEAR)
          : null,
      source: "converted",
    };
  }
  return { min: null, max: null, source: "none" };
}
