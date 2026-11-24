/**
 * AI match ranking for Job Opening assign pulldown.
 *
 * Computes on Job Opening detail load (and refreshes when job/talent fingerprints
 * change). Results are cached in-memory so remounts / reload of the same snapshot
 * do not recompute. Manual Assign match remains the action — this only ranks.
 */

import type { ActiveTalentOption } from "@/lib/admin/demo";
import {
  rankTalentAgainstJob,
  type CandidateMatchScore,
  type ScoreJobInput,
  type ScoreTalentInput,
} from "@/lib/matching/score-candidate";

export type AiMatchCandidate = {
  talentProfileId: string;
  score: number;
  reasons: string[];
  criticalScore: number;
  softScore: number;
  profileQualityScore: number;
  rank: number;
};

export type AiMatchRequest = {
  jobPostingId: string;
  limit?: number;
  /** When provided, skip DB — score this snapshot (preferred path on detail load). */
  job?: ScoreJobInput & { updatedAt?: string | null };
  talent?: ScoreTalentInput[];
  /** Optional fingerprint extras (e.g. already-matched ids). */
  fingerprintExtra?: string;
};

export type AiMatchResult = {
  jobPostingId: string;
  candidates: AiMatchCandidate[];
  /** Ranked assignable options with brief why — ready for the Select. */
  matchableTalent: ActiveTalentOption[];
  engine: "rules-v1" | "stub";
  message: string;
  cached: boolean;
};

type CacheEntry = {
  fingerprint: string;
  result: AiMatchResult;
  at: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function buildFingerprint(request: AiMatchRequest): string {
  const job = request.job;
  const talent = request.talent ?? [];
  const jobPart = job
    ? [
        job.updatedAt ?? "",
        (job.locationModes ?? []).join(","),
        job.globalCity ?? "",
        job.payType ?? "",
        String(job.minSalary ?? ""),
        job.timezone ?? "",
        job.workHoursStart ?? "",
        job.workHoursEnd ?? "",
        (job.visaStatuses ?? []).join(","),
        (job.verifiedSkills ?? []).join("|"),
        (job.endorsedSkills ?? []).join("|"),
      ].join("~")
    : "no-job";
  const talentPart = talent
    .map(
      (t) =>
        `${t.id}:${t.minSalary ?? ""}:${t.payAnnualMin ?? ""}-${t.payAnnualMax ?? ""}:${t.payHourlyMin ?? ""}-${t.payHourlyMax ?? ""}:${(t.verifiedSkills ?? []).length}:${
          t.avgAuthenticityScore ?? ""
        }:${t.verifiedReferenceCount}`
    )
    .join(";");
  return [
    request.jobPostingId,
    jobPart,
    talentPart,
    request.fingerprintExtra ?? "",
    String(request.limit ?? ""),
  ].join("::");
}

function toActiveOptions(
  talent: ScoreTalentInput[],
  scores: CandidateMatchScore[],
  display: Map<string, Pick<ActiveTalentOption, "headline" | "email" | "full_name" | "status">>
): ActiveTalentOption[] {
  return scores.map((score, index) => {
    const meta = display.get(score.talentProfileId);
    const source = talent.find((t) => t.id === score.talentProfileId);
    return {
      id: score.talentProfileId,
      headline: meta?.headline ?? source?.selectedTagline ?? null,
      email: meta?.email ?? null,
      full_name: meta?.full_name ?? null,
      status: meta?.status ?? "actively_looking",
      matchRank: index + 1,
      matchScore: score.displayScore,
      matchReasons: score.reasons,
    };
  });
}

/**
 * Rank Active / On Hold talent for a job opening.
 * Prefer passing job + talent snapshots from the detail loader.
 */
export async function proposeAiMatches(
  request: AiMatchRequest,
  displayMeta?: Map<
    string,
    Pick<ActiveTalentOption, "headline" | "email" | "full_name" | "status">
  >
): Promise<AiMatchResult> {
  if (!request.job || !request.talent) {
    return {
      jobPostingId: request.jobPostingId,
      candidates: [],
      matchableTalent: [],
      engine: "stub",
      message:
        "AI ranking needs job and talent snapshots. Load Job Opening detail to compute matches.",
      cached: false,
    };
  }

  const fingerprint = buildFingerprint(request);
  const cached = cache.get(request.jobPostingId);
  if (
    cached &&
    cached.fingerprint === fingerprint &&
    Date.now() - cached.at < CACHE_TTL_MS
  ) {
    return { ...cached.result, cached: true };
  }

  const ranked = rankTalentAgainstJob(request.job, request.talent);
  const limited =
    typeof request.limit === "number" && request.limit > 0
      ? ranked.slice(0, request.limit)
      : ranked;

  const meta =
    displayMeta ??
    new Map(
      request.talent.map((t) => [
        t.id,
        {
          headline: t.selectedTagline,
          email: null,
          full_name: null,
          status: "actively_looking",
        },
      ])
    );

  const matchableTalent = toActiveOptions(request.talent, limited, meta);
  const candidates: AiMatchCandidate[] = limited.map((score, index) => ({
    talentProfileId: score.talentProfileId,
    score: score.displayScore,
    reasons: score.reasons,
    criticalScore: Number(score.criticalScore.toFixed(3)),
    softScore: Number(score.softScore.toFixed(3)),
    profileQualityScore: score.profileQualityScore,
    rank: index + 1,
  }));

  const top = candidates[0];
  const message = top
    ? `Ranked ${candidates.length} assignable talent by hard fit, then skills + superpowers (tiebreak: profile score). Top: #${top.rank} (${top.reasons.join(" · ")}).`
    : "No Active or On Hold talent left to rank for this opening.";

  const result: AiMatchResult = {
    jobPostingId: request.jobPostingId,
    candidates,
    matchableTalent,
    engine: "rules-v1",
    message,
    cached: false,
  };

  cache.set(request.jobPostingId, {
    fingerprint,
    result: { ...result, cached: true },
    at: Date.now(),
  });

  return result;
}

/** Test helper — clear in-memory ranking cache. */
export function clearAiMatchCache(): void {
  cache.clear();
}
