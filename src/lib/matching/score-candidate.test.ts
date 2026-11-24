import assert from "node:assert/strict";
import { test } from "node:test";

import {
  compareCandidateScores,
  computeProfileQualityScore,
  rankTalentAgainstJob,
  scoreTalentAgainstJob,
  type ScoreJobInput,
  type ScoreTalentInput,
} from "@/lib/matching/score-candidate";

const baseJob: ScoreJobInput = {
  locationModes: ["remote", "hybrid"],
  globalCity: "Austin",
  globalCountry: "United States",
  payType: "annual",
  minSalary: 180000,
  timezone: "America/Chicago",
  workHoursStart: "09:00",
  workHoursEnd: "17:00",
  visaStatuses: ["none", "us_green_card"],
  verifiedSkills: ["TypeScript", "Kubernetes", "Postgres"],
  endorsedSkills: ["arch-platform", "speed-ship"],
};

function talent(
  overrides: Partial<ScoreTalentInput> & { id: string }
): ScoreTalentInput {
  return {
    locationModes: ["remote"],
    globalCity: "Austin",
    globalCountry: "United States",
    payType: "annual",
    minSalary: 160000,
    timezone: "America/Chicago",
    timezoneOffset: -360,
    workHoursStart: "09:00",
    workHoursEnd: "17:00",
    visaStatus: "none",
    verifiedSkills: ["TypeScript", "Kubernetes", "Postgres"],
    verifiedSuperpowers: ["arch-platform", "speed-ship"],
    selectedTagline: "Ships reliable platforms",
    hasResume: true,
    hasProfileBasics: true,
    verifiedReferenceCount: 3,
    avgAuthenticityScore: 80,
    ...overrides,
  };
}

test("critical fit beats soft skills when hard dimensions fail", () => {
  const goodHard = scoreTalentAgainstJob(
    baseJob,
    talent({
      id: "a",
      verifiedSkills: [],
      verifiedSuperpowers: [],
      avgAuthenticityScore: 10,
    })
  );
  const goodSoftBadHard = scoreTalentAgainstJob(
    baseJob,
    talent({
      id: "b",
      locationModes: ["onsite"],
      globalCity: "Berlin",
      globalCountry: "Germany",
      minSalary: 300000,
      timezone: "Asia/Tokyo",
      workHoursStart: "22:00",
      workHoursEnd: "06:00",
      visaStatus: "us_h1b",
      verifiedSkills: ["TypeScript", "Kubernetes", "Postgres"],
      verifiedSuperpowers: ["arch-platform", "speed-ship"],
      avgAuthenticityScore: 99,
    })
  );

  assert.ok(goodHard.criticalScore > goodSoftBadHard.criticalScore);
  assert.equal(compareCandidateScores(goodHard, goodSoftBadHard) < 0, true);
});

test("skills and superpowers weigh equally in soft score", () => {
  const skillsOnly = scoreTalentAgainstJob(
    baseJob,
    talent({
      id: "skills",
      verifiedSkills: ["TypeScript", "Kubernetes", "Postgres"],
      verifiedSuperpowers: [],
    })
  );
  const powersOnly = scoreTalentAgainstJob(
    baseJob,
    talent({
      id: "powers",
      verifiedSkills: [],
      verifiedSuperpowers: ["arch-platform", "speed-ship"],
    })
  );
  assert.equal(skillsOnly.skillsScore, 1);
  assert.equal(skillsOnly.superpowerScore, 0);
  assert.equal(powersOnly.skillsScore, 0);
  assert.equal(powersOnly.superpowerScore, 1);
  assert.equal(skillsOnly.softScore, powersOnly.softScore);
});

test("profile quality is the tiebreak after critical and soft", () => {
  const lowQuality = scoreTalentAgainstJob(
    baseJob,
    talent({
      id: "low",
      avgAuthenticityScore: 20,
      verifiedReferenceCount: 0,
      hasResume: false,
    })
  );
  const highQuality = scoreTalentAgainstJob(
    baseJob,
    talent({
      id: "high",
      avgAuthenticityScore: 95,
      verifiedReferenceCount: 3,
      hasResume: true,
    })
  );
  assert.ok(highQuality.profileQualityScore > lowQuality.profileQualityScore);
  // Same critical + soft → quality decides
  assert.equal(lowQuality.criticalScore, highQuality.criticalScore);
  assert.equal(lowQuality.softScore, highQuality.softScore);
  assert.equal(compareCandidateScores(highQuality, lowQuality) < 0, true);
});

test("rankTalentAgainstJob orders by critical then soft then quality", () => {
  const ranked = rankTalentAgainstJob(baseJob, [
    talent({
      id: "soft-star",
      locationModes: ["onsite"],
      visaStatus: "us_h1b",
      minSalary: 400000,
      timezone: "Asia/Tokyo",
      verifiedSkills: ["TypeScript", "Kubernetes", "Postgres"],
      verifiedSuperpowers: ["arch-platform", "speed-ship"],
      avgAuthenticityScore: 99,
    }),
    talent({
      id: "hard-fit-low-quality",
      avgAuthenticityScore: 40,
      verifiedReferenceCount: 1,
    }),
    talent({
      id: "hard-fit-high-quality",
      avgAuthenticityScore: 90,
    }),
  ]);
  assert.equal(ranked[0]?.talentProfileId, "hard-fit-high-quality");
  assert.equal(ranked[1]?.talentProfileId, "hard-fit-low-quality");
  assert.equal(ranked[2]?.talentProfileId, "soft-star");
  assert.ok((ranked[0]?.reasons.length ?? 0) > 0);
});

test("computeProfileQualityScore rewards completeness and authenticity", () => {
  const empty = computeProfileQualityScore({
    hasResume: false,
    hasProfileBasics: false,
    verifiedReferenceCount: 0,
    avgAuthenticityScore: null,
  });
  const full = computeProfileQualityScore({
    hasResume: true,
    hasProfileBasics: true,
    verifiedReferenceCount: 3,
    avgAuthenticityScore: 100,
  });
  assert.equal(empty, 0);
  assert.equal(full, 100);
});

test("pay fit fails when talent ask is far above job budget", () => {
  const scored = scoreTalentAgainstJob(
    baseJob,
    talent({ id: "pricey", minSalary: 300000 })
  );
  const pay = scored.critical.find((d) => d.key === "pay");
  assert.ok(pay);
  assert.equal(pay.score, 0);
});

test("visa match accepts talent status listed on the job", () => {
  const ok = scoreTalentAgainstJob(
    baseJob,
    talent({ id: "visa-ok", visaStatus: "us_green_card" })
  );
  const bad = scoreTalentAgainstJob(
    baseJob,
    talent({ id: "visa-bad", visaStatus: "us_h1b" })
  );
  const okVisa = ok.critical.find((d) => d.key === "visa");
  const badVisa = bad.critical.find((d) => d.key === "visa");
  assert.equal(okVisa?.score, 1);
  assert.equal(badVisa?.score, 0);
});
