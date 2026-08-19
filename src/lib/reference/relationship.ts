import { z } from "zod";

export const REFERENCE_RELATIONSHIP_VALUES = [
  "peer",
  "direct_report",
  "manager",
  "skip_level",
] as const;

export type ReferenceRelationship =
  (typeof REFERENCE_RELATIONSHIP_VALUES)[number];

/** Empty select value for forms before the candidate chooses a relationship. */
export const UNSELECTED_RELATIONSHIP = "" as ReferenceRelationship;

export const REFERENCE_RELATIONSHIP_OPTIONS: ReadonlyArray<{
  value: ReferenceRelationship;
  label: string;
}> = [
  { value: "peer", label: "Peer" },
  { value: "direct_report", label: "Direct Report" },
  { value: "manager", label: "Former Manager" },
  { value: "skip_level", label: "Skip Level Manager" },
];

const LABEL_BY_VALUE = new Map<string, string>([
  ...REFERENCE_RELATIONSHIP_OPTIONS.map(
    (option) => [option.value, option.label] as const
  ),
  ["other", "Other"],
  ["former_manager", "Former Manager"],
  ["skip_level_manager", "Skip Level Manager"],
  ["Former manager", "Former Manager"],
  ["Peer collaborator", "Peer"],
  ["Skip-level / director", "Skip Level Manager"],
]);

export function isReferenceRelationship(
  value: string | null | undefined
): value is ReferenceRelationship {
  return (
    typeof value === "string" &&
    (REFERENCE_RELATIONSHIP_VALUES as readonly string[]).includes(value)
  );
}

export function relationshipLabel(
  value: string | null | undefined
): string {
  if (!value) return "";
  return LABEL_BY_VALUE.get(value) ?? value;
}

export const referenceRelationshipSchema = z.enum(
  REFERENCE_RELATIONSHIP_VALUES,
  { error: "Select a relationship" }
);
