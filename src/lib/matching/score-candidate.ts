/**
 * Deterministic AI match scoring for the Assignable talent pulldown.
 *
 * Sort order (David):
 *  1) CRITICAL hard fit — location, pay, timezone, work hours, visa
 *  2) skills vs job requirements  } equal weight after (1)
 *  3) superpower match            }
 *  Tiebreak: candidate profile quality score
 */

import { REQUIRED_VERIFIED_REFERENCES } from "@/lib/dashboard/talent";
import { timezoneOffsetMinutes } from "@/lib/onboarding/schema";
import { SUPERPOWER_TAXONOMY } from "@/lib/reference/taxonomy";

export type ScoreJobInput = {
  locationModes: string[];
  globalCity: string | null;
  globalCountry?: string | null;
  payType?: string | null;
  minSalary: number | null;
  timezone: string | null;
  workHoursStart: string | null;
  workHoursEnd: string | null;
  visaStatuses: string[];
  verifiedSkills: string[];
  endorsedSkills: string[];
};

export type ScoreTalentInput = {
  id: string;
  locationModes: string[];
  globalCity: string | null;
  globalCountry: string | null;
  payType?: string | null;
  minSalary: number | null;
  timezone: string | null;
  timezoneOffset: number | null;
  workHoursStart: string | null;
  workHoursEnd: string | null;
  visaStatus: string | null;
  verifiedSkills: string[];
  /** Taxonomy ids from verified_superpowers aggregation. */
  verifiedSuperpowers: string[];
  selectedTagline: string | null;
  hasResume: boolean;
  hasProfileBasics: boolean;
  verifiedReferenceCount: number;
  avgAuthenticityScore: number | null;
};

export type DimensionScore = {
  key: string;
  label: string;
  score: number;
  detail: string;
};

export type CandidateMatchScore = {
  talentProfileId: string;
  /** 0–1 hard-fit average across the five critical dimensions. */
  criticalScore: number;
  /** 0–1 skills overlap vs job verified_skills. */
  skillsScore: number;
  /** 0–1 superpower overlap vs job endorsed_skills. */
  superpowerScore: number;
  /** 0–100 profile quality (completeness + authenticity). */
  profileQualityScore: number;
  /** Equal blend of skills + superpowers after critical. */
  softScore: number;
  /** Display 0–100 composite for UI. */
  displayScore: number;
  critical: DimensionScore[];
  reasons: string[];
};

const SUPERPOWER_BY_ID = new Map(
  SUPERPOWER_TAXONOMY.map((item) => [item.id, item])
);

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseClockToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})/.exec(trimmed);
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(mins) ||
    hours < 0 ||
    hours > 23 ||
    mins < 0 ||
    mins > 59
  ) {
    return null;
  }
  return hours * 60 + mins;
}

/** Convert local clock minutes + UTC offset to minutes-of-day in UTC (0–1439). */
function toUtcMinutes(
  localMinutes: number,
  offsetMinutes: number
): number {
  const utc = localMinutes - offsetMinutes;
  return ((utc % 1440) + 1440) % 1440;
}

/**
 * Overlap of two time windows on a 24h circle, in minutes.
 * Windows may wrap midnight.
 */
function windowOverlapMinutes(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): number {
  const expand = (start: number, end: number): Array<[number, number]> => {
    if (start === end) return [[0, 1440]];
    if (end > start) return [[start, end]];
    return [
      [start, 1440],
      [0, end],
    ];
  };
  let overlap = 0;
  for (const [as, ae] of expand(aStart, aEnd)) {
    for (const [bs, be] of expand(bStart, bEnd)) {
      overlap += Math.max(0, Math.min(ae, be) - Math.max(as, bs));
    }
  }
  return overlap;
}

function annualizePay(
  amount: number | null | undefined,
  payType: string | null | undefined
): number | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;
  if (payType === "hourly") return Math.round(amount * 2080);
  return Math.round(amount);
}

function scoreLocation(
  job: ScoreJobInput,
  talent: ScoreTalentInput
): DimensionScore {
  const jobModes = new Set(
    (job.locationModes ?? []).map(normalizeToken).filter(Boolean)
  );
  const talentModes = new Set(
    (talent.locationModes ?? []).map(normalizeToken).filter(Boolean)
  );

  if (jobModes.size === 0) {
    return {
      key: "location",
      label: "Location",
      score: 0.5,
      detail: "Job location open",
    };
  }
  if (talentModes.size === 0) {
    return {
      key: "location",
      label: "Location",
      score: 0,
      detail: "Talent location unknown",
    };
  }

  let modeHits = 0;
  for (const mode of jobModes) {
    if (talentModes.has(mode)) modeHits += 1;
  }
  const modeScore = modeHits / jobModes.size;

  const needsPlace =
    jobModes.has("hybrid") || jobModes.has("onsite");
  let placeBonus = 0;
  let placeDetail = "";
  if (needsPlace && job.globalCity) {
    const jobCity = normalizeToken(job.globalCity);
    const talentCity = normalizeToken(talent.globalCity ?? "");
    if (jobCity && talentCity && jobCity === talentCity) {
      placeBonus = 0.15;
      placeDetail = ` · ${job.globalCity}`;
    } else if (
      job.globalCountry &&
      talent.globalCountry &&
      normalizeToken(job.globalCountry) ===
        normalizeToken(talent.globalCountry)
    ) {
      placeBonus = 0.05;
      placeDetail = ` · ${job.globalCountry}`;
    }
  }

  const score = clamp01(modeScore + placeBonus);
  const shared = [...jobModes].filter((m) => talentModes.has(m));
  return {
    key: "location",
    label: "Location",
    score,
    detail:
      shared.length > 0
        ? `Modes: ${shared.join("/")}${placeDetail}`
        : "No shared location mode",
  };
}

function scorePay(
  job: ScoreJobInput,
  talent: ScoreTalentInput
): DimensionScore {
  const jobAnnual = annualizePay(job.minSalary, job.payType);
  const talentAnnual = annualizePay(talent.minSalary, talent.payType);

  if (jobAnnual == null && talentAnnual == null) {
    return {
      key: "pay",
      label: "Pay",
      score: 0.5,
      detail: "Pay not set",
    };
  }
  if (jobAnnual == null) {
    return {
      key: "pay",
      label: "Pay",
      score: 0.35,
      detail: "Job pay unknown",
    };
  }
  if (talentAnnual == null) {
    return {
      key: "pay",
      label: "Pay",
      score: 0.6,
      detail: "Talent pay flexible",
    };
  }

  // Employer budget covers talent ask → full fit. Soft degrade up to 25% over budget.
  if (talentAnnual <= jobAnnual) {
    return {
      key: "pay",
      label: "Pay",
      score: 1,
      detail: "Within budget",
    };
  }
  const over = (talentAnnual - jobAnnual) / jobAnnual;
  if (over <= 0.25) {
    return {
      key: "pay",
      label: "Pay",
      score: clamp01(1 - over / 0.25),
      detail: "Slightly above budget",
    };
  }
  return {
    key: "pay",
    label: "Pay",
    score: 0,
    detail: "Above budget",
  };
}

function scoreTimezone(
  job: ScoreJobInput,
  talent: ScoreTalentInput
): DimensionScore {
  const jobOffset =
    timezoneOffsetMinutes(job.timezone) ??
    null;
  const talentOffset =
    timezoneOffsetMinutes(talent.timezone) ??
    (typeof talent.timezoneOffset === "number"
      ? talent.timezoneOffset
      : null);

  if (jobOffset == null && talentOffset == null) {
    return {
      key: "timezone",
      label: "Timezone",
      score: 0.5,
      detail: "Timezone open",
    };
  }
  if (jobOffset == null || talentOffset == null) {
    return {
      key: "timezone",
      label: "Timezone",
      score: 0.4,
      detail: "Timezone incomplete",
    };
  }

  const deltaHours = Math.abs(jobOffset - talentOffset) / 60;
  if (deltaHours === 0) {
    return {
      key: "timezone",
      label: "Timezone",
      score: 1,
      detail: "Same timezone",
    };
  }
  if (deltaHours <= 2) {
    return {
      key: "timezone",
      label: "Timezone",
      score: 0.75,
      detail: `±${deltaHours}h`,
    };
  }
  if (deltaHours <= 4) {
    return {
      key: "timezone",
      label: "Timezone",
      score: 0.45,
      detail: `±${deltaHours}h`,
    };
  }
  if (deltaHours <= 8) {
    return {
      key: "timezone",
      label: "Timezone",
      score: 0.2,
      detail: `±${deltaHours}h`,
    };
  }
  return {
    key: "timezone",
    label: "Timezone",
    score: 0,
    detail: `±${deltaHours}h`,
  };
}

function scoreWorkHours(
  job: ScoreJobInput,
  talent: ScoreTalentInput
): DimensionScore {
  const jobStart = parseClockToMinutes(job.workHoursStart);
  const jobEnd = parseClockToMinutes(job.workHoursEnd);
  const talentStart = parseClockToMinutes(talent.workHoursStart);
  const talentEnd = parseClockToMinutes(talent.workHoursEnd);

  if (
    jobStart == null ||
    jobEnd == null ||
    talentStart == null ||
    talentEnd == null
  ) {
    return {
      key: "hours",
      label: "Work hours",
      score: 0.45,
      detail: "Hours incomplete",
    };
  }

  const jobOffset = timezoneOffsetMinutes(job.timezone) ?? 0;
  const talentOffset =
    timezoneOffsetMinutes(talent.timezone) ??
    (typeof talent.timezoneOffset === "number" ? talent.timezoneOffset : 0);

  const jStartUtc = toUtcMinutes(jobStart, jobOffset);
  const jEndUtc = toUtcMinutes(jobEnd, jobOffset);
  const tStartUtc = toUtcMinutes(talentStart, talentOffset);
  const tEndUtc = toUtcMinutes(talentEnd, talentOffset);

  const jobSpan =
    jobEnd === jobStart
      ? 1440
      : jobEnd > jobStart
        ? jobEnd - jobStart
        : 1440 - jobStart + jobEnd;
  const overlap = windowOverlapMinutes(
    jStartUtc,
    jEndUtc,
    tStartUtc,
    tEndUtc
  );
  const ratio = jobSpan > 0 ? overlap / jobSpan : 0;

  if (ratio >= 0.75) {
    return {
      key: "hours",
      label: "Work hours",
      score: 1,
      detail: `${Math.round(ratio * 100)}% overlap`,
    };
  }
  if (ratio >= 0.4) {
    return {
      key: "hours",
      label: "Work hours",
      score: clamp01(ratio / 0.75),
      detail: `${Math.round(ratio * 100)}% overlap`,
    };
  }
  if (ratio > 0) {
    return {
      key: "hours",
      label: "Work hours",
      score: clamp01(ratio * 0.8),
      detail: `${Math.round(ratio * 100)}% overlap`,
    };
  }
  return {
    key: "hours",
    label: "Work hours",
    score: 0,
    detail: "No overlap",
  };
}

function scoreVisa(
  job: ScoreJobInput,
  talent: ScoreTalentInput
): DimensionScore {
  const allowed = new Set(
    (job.visaStatuses ?? []).map(normalizeToken).filter(Boolean)
  );
  const talentVisa = normalizeToken(talent.visaStatus ?? "");

  if (allowed.size === 0) {
    return {
      key: "visa",
      label: "Visa",
      score: 0.5,
      detail: "Visa open",
    };
  }
  if (!talentVisa) {
    return {
      key: "visa",
      label: "Visa",
      score: 0.25,
      detail: "Talent visa unknown",
    };
  }
  if (allowed.has(talentVisa) || allowed.has("other")) {
    return {
      key: "visa",
      label: "Visa",
      score: 1,
      detail: "Work auth OK",
    };
  }
  // Citizens / no-sponsorship often interchangeable with "none"
  if (
    allowed.has("none") &&
    (talentVisa === "none" ||
      talentVisa === "us_green_card" ||
      talentVisa === "eu_work")
  ) {
    return {
      key: "visa",
      label: "Visa",
      score: 0.9,
      detail: "No sponsorship needed",
    };
  }
  return {
    key: "visa",
    label: "Visa",
    score: 0,
    detail: "Work auth mismatch",
  };
}

function scoreSkills(
  job: ScoreJobInput,
  talent: ScoreTalentInput
): { score: number; matched: number; total: number; labels: string[] } {
  const required = (job.verifiedSkills ?? [])
    .map(normalizeToken)
    .filter(Boolean);
  if (required.length === 0) {
    return { score: 0.5, matched: 0, total: 0, labels: [] };
  }
  const have = new Set(
    (talent.verifiedSkills ?? []).map(normalizeToken).filter(Boolean)
  );
  const labels: string[] = [];
  let matched = 0;
  for (const skill of required) {
    if (have.has(skill)) {
      matched += 1;
      const original =
        job.verifiedSkills.find(
          (s) => normalizeToken(s) === skill
        ) ?? skill;
      labels.push(original);
    }
  }
  return {
    score: matched / required.length,
    matched,
    total: required.length,
    labels: labels.slice(0, 3),
  };
}

function scoreSuperpowers(
  job: ScoreJobInput,
  talent: ScoreTalentInput
): { score: number; matched: number; total: number; labels: string[] } {
  const required = (job.endorsedSkills ?? [])
    .map((id) => id.trim())
    .filter(Boolean);
  if (required.length === 0) {
    return { score: 0.5, matched: 0, total: 0, labels: [] };
  }
  const have = new Set(
    (talent.verifiedSuperpowers ?? []).map((id) => id.trim()).filter(Boolean)
  );
  const labels: string[] = [];
  let matched = 0;
  for (const id of required) {
    if (have.has(id)) {
      matched += 1;
      labels.push(SUPERPOWER_BY_ID.get(id)?.label ?? id);
    }
  }
  return {
    score: matched / required.length,
    matched,
    total: required.length,
    labels: labels.slice(0, 3),
  };
}

/** 0–100 profile quality: completeness + authenticity “score”. */
export function computeProfileQualityScore(
  talent: Pick<
    ScoreTalentInput,
    | "hasResume"
    | "hasProfileBasics"
    | "verifiedReferenceCount"
    | "avgAuthenticityScore"
  >
): number {
  let completeness = 0;
  if (talent.hasResume) completeness += 20;
  if (talent.hasProfileBasics) completeness += 20;
  const refRatio = Math.min(
    1,
    talent.verifiedReferenceCount / REQUIRED_VERIFIED_REFERENCES
  );
  completeness += Math.round(refRatio * 20);

  const authenticity =
    typeof talent.avgAuthenticityScore === "number" &&
    Number.isFinite(talent.avgAuthenticityScore)
      ? Math.max(0, Math.min(100, talent.avgAuthenticityScore))
      : 0;
  // authenticity up to 40 pts
  const authPts = Math.round((authenticity / 100) * 40);
  return Math.max(0, Math.min(100, completeness + authPts));
}

export function scoreTalentAgainstJob(
  job: ScoreJobInput,
  talent: ScoreTalentInput
): CandidateMatchScore {
  const criticalDims = [
    scoreLocation(job, talent),
    scorePay(job, talent),
    scoreTimezone(job, talent),
    scoreWorkHours(job, talent),
    scoreVisa(job, talent),
  ];
  const criticalScore =
    criticalDims.reduce((sum, d) => sum + d.score, 0) / criticalDims.length;

  const skills = scoreSkills(job, talent);
  const supers = scoreSuperpowers(job, talent);
  const softScore = (skills.score + supers.score) / 2;
  const profileQualityScore = computeProfileQualityScore(talent);

  // Display composite keeps critical dominant while surfacing soft fit.
  const displayScore = Math.round(
    clamp01(criticalScore) * 70 +
      clamp01(softScore) * 25 +
      (profileQualityScore / 100) * 5
  );

  const reasons: string[] = [];
  const hardPass = criticalDims.filter((d) => d.score >= 0.75).length;
  const hardFail = criticalDims.filter((d) => d.score < 0.35);
  if (hardPass === criticalDims.length) {
    reasons.push("Hard fit");
  } else if (hardFail.length === 0) {
    reasons.push(`Hard ${hardPass}/5`);
  } else {
    reasons.push(
      `Gap: ${hardFail
        .slice(0, 2)
        .map((d) => d.label.toLowerCase())
        .join(", ")}`
    );
  }

  if (skills.total > 0) {
    reasons.push(
      skills.matched > 0
        ? `${skills.matched}/${skills.total} skills${
            skills.labels[0] ? ` (${skills.labels[0]})` : ""
          }`
        : `0/${skills.total} skills`
    );
  }
  if (supers.total > 0) {
    reasons.push(
      supers.matched > 0
        ? `${supers.matched}/${supers.total} powers${
            supers.labels[0] ? ` (${supers.labels[0]})` : ""
          }`
        : `0/${supers.total} powers`
    );
  }

  return {
    talentProfileId: talent.id,
    criticalScore,
    skillsScore: skills.score,
    superpowerScore: supers.score,
    profileQualityScore,
    softScore,
    displayScore,
    critical: criticalDims,
    reasons: reasons.slice(0, 3),
  };
}

/** Sort: critical → soft (skills+superpowers) → profile quality. */
export function compareCandidateScores(
  a: CandidateMatchScore,
  b: CandidateMatchScore
): number {
  if (b.criticalScore !== a.criticalScore) {
    return b.criticalScore - a.criticalScore;
  }
  if (b.softScore !== a.softScore) {
    return b.softScore - a.softScore;
  }
  if (b.profileQualityScore !== a.profileQualityScore) {
    return b.profileQualityScore - a.profileQualityScore;
  }
  return a.talentProfileId.localeCompare(b.talentProfileId);
}

export function rankTalentAgainstJob(
  job: ScoreJobInput,
  talent: ScoreTalentInput[]
): CandidateMatchScore[] {
  return talent
    .map((row) => scoreTalentAgainstJob(job, row))
    .sort(compareCandidateScores);
}
