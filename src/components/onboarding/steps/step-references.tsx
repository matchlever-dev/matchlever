"use client";

import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import type { OnboardingFormValues } from "@/lib/onboarding/form-schema";
import { ensureAbsoluteHttpUrl, urlTextInputProps } from "@/lib/url";
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
  { index: 0 },
  { index: 1 },
  { index: 2 },
] as const;

export function StepReferences() {
  const {
    register,
    control,
    setError,
    clearErrors,
    setValue,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();
  const [checkingIndex, setCheckingIndex] = useState<number | null>(null);

  async function checkLinkedInPage(index: number, rawUrl: string) {
    const url = rawUrl.trim();
    if (!url) return;
    setCheckingIndex(index);
    try {
      const res = await fetch("/api/reference/validate-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [url] }),
      });
      const data = (await res.json()) as {
        error?: string;
        results?: Array<{
          valid: boolean;
          normalizedUrl: string;
          error: string | null;
        }>;
      };
      const result = data.results?.[0];
      if (!res.ok || !result?.valid) {
        setError(`references.${index}.linkedInUrl`, {
          type: "manual",
          message:
            result?.error ||
            data.error ||
            "This LinkedIn page could not be opened. Check the URL.",
        });
        return;
      }
      clearErrors(`references.${index}.linkedInUrl`);
      setValue(`references.${index}.linkedInUrl`, result.normalizedUrl, {
        shouldDirty: true,
        shouldValidate: false,
      });
    } catch {
      setError(`references.${index}.linkedInUrl`, {
        type: "manual",
        message: "This LinkedIn page could not be opened. Check the URL.",
      });
    } finally {
      setCheckingIndex(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#2B5B84] sm:text-3xl">
          Reference intake
        </h2>
        <p className="mt-2 text-sm text-[#2A2D34]/70 sm:text-base">
          Add all three references — any mix of former managers or peers is
          fine. Each LinkedIn profile URL is checked live and must actually
          open before you can finish this step.
        </p>
      </div>

      <div className="space-y-5">
        {REFERENCE_SLOTS.map((slot) => (
          <div
            key={slot.index}
            className="grid gap-3 rounded-xl border border-[#2B5B84]/15 bg-white p-4 sm:p-5"
          >
            <p className="text-xs font-semibold tracking-wide text-[#E87A5D] uppercase">
              Reference {slot.index + 1}
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
              <Label htmlFor={`ref-linkedin-${slot.index}`}>
                LinkedIn profile URL
              </Label>
              <Input
                id={`ref-linkedin-${slot.index}`}
                {...urlTextInputProps}
                placeholder="https://www.linkedin.com/in/their-profile"
                {...register(`references.${slot.index}.linkedInUrl`, {
                  onBlur: (event) => {
                    const completed = ensureAbsoluteHttpUrl(event.target.value);
                    if (completed && completed !== event.target.value) {
                      setValue(
                        `references.${slot.index}.linkedInUrl`,
                        completed,
                        { shouldDirty: true, shouldValidate: false }
                      );
                    }
                    void checkLinkedInPage(slot.index, completed);
                  },
                })}
              />
              {checkingIndex === slot.index && (
                <p className="text-xs text-[#5B616B]" aria-live="polite">
                  Checking that this LinkedIn page opens…
                </p>
              )}
              {errors.references?.[slot.index]?.linkedInUrl && (
                <p className="text-xs text-destructive">
                  {errors.references[slot.index]?.linkedInUrl?.message}
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
