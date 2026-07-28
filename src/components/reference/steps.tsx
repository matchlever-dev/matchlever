"use client";

import { Controller, useFormContext } from "react-hook-form";

import type { ReferenceFormValues } from "@/lib/reference/schema";
import { groupSuperpowersByCategory } from "@/lib/reference/taxonomy";
import { ReferrerSeekerCta } from "@/components/reference/referrer-seeker-cta";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

const RELATIONSHIP_OPTIONS = [
  { value: "manager", label: "Former manager" },
  { value: "skip_level", label: "Skip-level / director" },
  { value: "peer", label: "Peer collaborator" },
  { value: "other", label: "Other" },
] as const;

export function StepIdentity({ candidateTitle }: { candidateTitle?: string }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ReferenceFormValues>();

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display text-[11px] font-semibold tracking-[0.24em] text-[#E87A5D] uppercase">
          Step 1 · Identity
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[#2B5B84]">
          Confirm who you are
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#5B616B]">
          You&apos;re verifying{" "}
          <span className="font-medium text-[#2A2D34]">
            {candidateTitle || "a MatchLever candidate"}
          </span>
          . Add your name, relationship, and LinkedIn profile URL.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="managerName">Your full name</Label>
        <Input
          id="managerName"
          autoComplete="name"
          placeholder="Alex Rivera"
          className="h-12 text-base"
          {...register("managerName")}
        />
        {errors.managerName && (
          <p className="text-xs text-destructive">{errors.managerName.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label>Relationship to candidate</Label>
        <Controller
          control={control}
          name="relationship"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) =>
                field.onChange(value as ReferenceFormValues["relationship"])
              }
            >
              <SelectTrigger className="h-12 w-full min-w-0 text-base">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.relationship && (
          <p className="text-xs text-destructive">{errors.relationship.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="linkedInUrl">Full LinkedIn profile URL</Label>
        <Input
          id="linkedInUrl"
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="https://linkedin.com/in/your-profile"
          className="h-12 text-base"
          {...register("linkedInUrl")}
        />
        <p className="text-xs text-[#5B616B]">
          Must be a profile URL like https://linkedin.com/in/...
        </p>
        {errors.linkedInUrl && (
          <p className="text-xs text-destructive">{errors.linkedInUrl.message}</p>
        )}
      </div>
    </div>
  );
}

export function StepSuperpowers() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ReferenceFormValues>();
  const selected = watch("superpowers") ?? [];
  const groups = groupSuperpowersByCategory();

  function toggle(id: string) {
    const set = new Set(selected);
    if (set.has(id)) {
      set.delete(id);
    } else if (set.size < 7) {
      set.add(id);
    }
    setValue("superpowers", [...set], { shouldValidate: true });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[11px] font-semibold tracking-[0.24em] text-[#E87A5D] uppercase">
            Step 2 · Superpowers
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[#2B5B84]">
            Pick their true strengths
          </h2>
          <p className="mt-2 text-sm text-[#5B616B]">
            Select exactly 7 superpowers across the taxonomy.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2.5 py-1.5 font-display text-[11px] font-bold tracking-wide uppercase ${
            selected.length === 7
              ? "bg-[#2B5B84] text-white"
              : "bg-[#E87A5D]/15 text-[#E87A5D]"
          }`}
        >
          {selected.length} of 7 Selected
        </span>
      </div>

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.category}>
            <p className="mb-2 font-display text-[10px] font-semibold tracking-[0.2em] text-[#2A2D34]/55 uppercase">
              {group.category}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {group.options.map((option) => {
                const isOn = selected.includes(option.id);
                const disabled = !isOn && selected.length >= 7;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggle(option.id)}
                    className={`min-h-12 rounded-lg border px-3 py-3 text-left text-sm font-medium transition active:scale-[0.99] ${
                      isOn
                        ? "border-[#2B5B84] bg-[#2B5B84] text-white"
                        : disabled
                          ? "border-[#2B5B84]/10 bg-[#F7F6F3] text-[#2A2D34]/35"
                          : "border-[#2B5B84]/20 bg-white text-[#2A2D34] hover:border-[#E87A5D]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {errors.superpowers && (
        <p className="text-xs text-destructive">
          {errors.superpowers.message as string}
        </p>
      )}
    </div>
  );
}

function RatingSlider({
  name,
  label,
}: {
  name: "reliability" | "technicalQuality" | "rehireIntent";
  label: string;
}) {
  const { control } = useFormContext<ReferenceFormValues>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="rounded-xl border border-[#2B5B84]/15 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Label className="text-base text-[#2A2D34]">{label}</Label>
            <span className="font-display text-lg font-bold text-[#E87A5D]">
              {field.value}/5
            </span>
          </div>
          <Slider
            min={1}
            max={5}
            step={1}
            value={[field.value]}
            onValueChange={(value) => {
              const next = Array.isArray(value) ? value[0] : value;
              if (typeof next === "number") field.onChange(next);
            }}
            className="py-3"
          />
          <div className="mt-2 flex justify-between font-display text-[10px] tracking-wide text-[#5B616B] uppercase">
            <span>1</span>
            <span>3</span>
            <span>5</span>
          </div>
        </div>
      )}
    />
  );
}

export function StepRatings() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-display text-[11px] font-semibold tracking-[0.24em] text-[#E87A5D] uppercase">
          Step 3 · Ratings
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[#2B5B84]">
          Score the working relationship
        </h2>
        <p className="mt-2 text-sm text-[#5B616B]">
          Drag each slider from 1 (low) to 5 (exceptional).
        </p>
      </div>

      <RatingSlider name="reliability" label="Reliability" />
      <RatingSlider name="technicalQuality" label="Technical Quality" />
      <RatingSlider name="rehireIntent" label="Re-hire Intent" />
    </div>
  );
}

export function StepEndorsement() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ReferenceFormValues>();
  const endorsement = watch("endorsement") ?? "";

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display text-[11px] font-semibold tracking-[0.24em] text-[#E87A5D] uppercase">
          Step 4 · Endorsement
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[#2B5B84]">
          One sentence that matters
        </h2>
        <p className="mt-2 text-sm text-[#5B616B]">
          Write a single high-signal endorsement hirers can trust.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="endorsement">Written endorsement</Label>
        <Textarea
          id="endorsement"
          rows={4}
          maxLength={280}
          placeholder="The most reliable engineer I managed for shipping complex platform work under pressure."
          className="min-h-28 text-base"
          {...register("endorsement")}
        />
        <div className="flex items-center justify-between text-xs text-[#5B616B]">
          <span>One sentence preferred</span>
          <span>{endorsement.length}/280</span>
        </div>
        {errors.endorsement && (
          <p className="text-xs text-destructive">{errors.endorsement.message}</p>
        )}
      </div>

      <ReferrerSeekerCta />
    </div>
  );
}
