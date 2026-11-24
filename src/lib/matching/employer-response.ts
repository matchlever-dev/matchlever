/** Employer decision on a match email: Accept or Pass. */

export const EMPLOYER_MATCH_RESPONSES = [
  "pending",
  "accepted",
  "passed",
] as const;

export type EmployerMatchResponse = (typeof EMPLOYER_MATCH_RESPONSES)[number];

export type EmployerMatchDecision = "accept" | "pass";

export function isEmployerMatchDecision(
  value: string | null | undefined
): value is EmployerMatchDecision {
  return value === "accept" || value === "pass";
}

export function employerResponseLabel(response: string): string {
  if (response === "accepted") return "Accepted";
  if (response === "passed") return "Passed";
  return "Pending";
}

export function decisionToResponse(
  decision: EmployerMatchDecision
): Exclude<EmployerMatchResponse, "pending"> {
  return decision === "accept" ? "accepted" : "passed";
}
