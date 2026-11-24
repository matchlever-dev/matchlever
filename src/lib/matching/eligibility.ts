/** Talent eligible for manual matching: Active or On Hold — never Incomplete. */

export const MATCHABLE_TALENT_STATUSES = [
  "actively_looking",
  "on_hold",
] as const;

export type MatchableTalentStatus = (typeof MATCHABLE_TALENT_STATUSES)[number];

export function isMatchableTalentStatus(
  status: string | null | undefined
): status is MatchableTalentStatus {
  return (
    status === "actively_looking" || status === "on_hold"
  );
}

export function talentStatusLabel(status: string): string {
  if (status === "actively_looking") return "Active";
  if (status === "on_hold") return "On Hold";
  if (status === "incomplete") return "Incomplete";
  return status.replaceAll("_", " ");
}
