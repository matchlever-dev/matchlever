"use client";

import {
  REFERENCE_RELATIONSHIP_OPTIONS,
  isReferenceRelationship,
  relationshipLabel,
  type ReferenceRelationship,
} from "@/lib/reference/relationship";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function RelationshipSelect({
  value,
  onValueChange,
  id,
  disabled,
  className,
}: {
  value: string;
  onValueChange: (value: ReferenceRelationship) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  const selectedLabel = relationshipLabel(value);

  return (
    <Select
      value={value || null}
      disabled={disabled}
      onValueChange={(next) => {
        if (isReferenceRelationship(next)) onValueChange(next);
      }}
    >
      <SelectTrigger id={id} className={cn("w-full min-w-0", className)}>
        <SelectValue placeholder="Select relationship">
          {selectedLabel || undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {REFERENCE_RELATIONSHIP_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
