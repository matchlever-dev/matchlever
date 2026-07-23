"use client";

import { Controller, useFormContext } from "react-hook-form";

import type { OnboardingFormValues } from "@/lib/onboarding/form-schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const REFERENCE_SLOTS = [
  { index: 0, title: "Former manager" },
  { index: 1, title: "Former manager or skip-level" },
  { index: 2, title: "Peer collaborator" },
] as const;

export function StepReferences() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#2B5B84] sm:text-3xl">
          Reference intake
        </h2>
        <p className="mt-2 text-sm text-[#2A2D34]/70 sm:text-base">
          Add three former managers or peers. Any valid email works—personal or
          work—so references can reply from wherever they prefer.
        </p>
      </div>

      <div className="space-y-5">
        {REFERENCE_SLOTS.map((slot) => (
          <div
            key={slot.index}
            className="grid gap-3 rounded-xl border border-[#2B5B84]/15 bg-white p-4 sm:p-5"
          >
            <p className="text-xs font-semibold tracking-wide text-[#E87A5D] uppercase">
              Reference {slot.index + 1} · {slot.title}
            </p>
            <div className="grid gap-2">
              <Label htmlFor={`ref-email-${slot.index}`}>Email address</Label>
              <Input
                id={`ref-email-${slot.index}`}
                type="email"
                placeholder="name@gmail.com or name@company.com"
                {...register(`references.${slot.index}.email`)}
              />
              {errors.references?.[slot.index]?.email && (
                <p className="text-xs text-destructive">
                  {errors.references[slot.index]?.email?.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Relationship</Label>
              <Controller
                control={control}
                name={`references.${slot.index}.relationship`}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange(value as "manager" | "peer")
                    }
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Former manager</SelectItem>
                      <SelectItem value="peer">Peer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
