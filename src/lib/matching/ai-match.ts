/**
 * AI matching extension point.
 *
 * The Two-Tier Match Engine will later score talent against a job opening
 * using a wide criteria set (skills, location, salary, references, etc.).
 * Do not implement ranking / scoring here yet — only the contract.
 */

export type AiMatchCandidate = {
  talentProfileId: string;
  score: number;
  reasons: string[];
};

export type AiMatchRequest = {
  jobPostingId: string;
  /** Optional hard filters the future engine should honor. */
  limit?: number;
};

export type AiMatchResult = {
  jobPostingId: string;
  candidates: AiMatchCandidate[];
  engine: "stub";
  message: string;
};

/**
 * Stub for the future AI match engine.
 * Returns an empty candidate list and never creates handshakes.
 */
export async function proposeAiMatches(
  request: AiMatchRequest
): Promise<AiMatchResult> {
  return {
    jobPostingId: request.jobPostingId,
    candidates: [],
    engine: "stub",
    message:
      "AI matching is not implemented yet. Assign Active or On Hold talent from the Job Opening detail page.",
  };
}
