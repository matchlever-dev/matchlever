"use client";

import { Controller, useFormContext } from "react-hook-form";

import type { OnboardingFormValues } from "@/lib/onboarding/form-schema";
import {
  LOCATION_MODES,
  TIMEZONE_OPTIONS,
  VISA_OPTIONS,
} from "@/lib/onboarding/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export function StepPreferences() {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();

  const minSalary = watch("minSalary");
  const taglines = watch("suggestedTaglines");
  const locationMode = watch("locationMode");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#2B5B84] sm:text-3xl">
          Global preferences
        </h2>
        <p className="mt-2 text-sm text-[#2A2D34]/70 sm:text-base">
          Tell hirers where you work from, when you overlap, and which Superpower
          Tagline leads your card.
        </p>
      </div>

      <fieldset className="space-y-3">
        <Label>Location mode</Label>
        <div className="grid grid-cols-3 gap-2">
          {LOCATION_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() =>
                setValue("locationMode", mode.value, { shouldValidate: true })
              }
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                locationMode === mode.value
                  ? "border-[#2B5B84] bg-[#2B5B84] text-white"
                  : "border-[#2B5B84]/20 bg-white text-[#2A2D34] hover:border-[#2B5B84]/50"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="globalCity">Global city</Label>
          <Input id="globalCity" placeholder="Austin" {...register("globalCity")} />
          {errors.globalCity && (
            <p className="text-xs text-destructive">{errors.globalCity.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="globalCountry">Global country</Label>
          <Input
            id="globalCountry"
            placeholder="United States"
            {...register("globalCountry")}
          />
          {errors.globalCountry && (
            <p className="text-xs text-destructive">
              {errors.globalCountry.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Timezone</Label>
        <Controller
          control={control}
          name="timezone"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => field.onChange(value ?? "")}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.timezone && (
          <p className="text-xs text-destructive">{errors.timezone.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="workHoursStart">Work hours start</Label>
          <Input
            id="workHoursStart"
            type="time"
            {...register("workHoursStart")}
          />
          {errors.workHoursStart && (
            <p className="text-xs text-destructive">
              {errors.workHoursStart.message}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="workHoursEnd">Work hours end</Label>
          <Input id="workHoursEnd" type="time" {...register("workHoursEnd")} />
          {errors.workHoursEnd && (
            <p className="text-xs text-destructive">
              {errors.workHoursEnd.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <Label>Minimum salary (USD)</Label>
          <span className="text-sm font-semibold text-[#E87A5D]">
            ${minSalary.toLocaleString()}
          </span>
        </div>
        <Controller
          control={control}
          name="minSalary"
          render={({ field }) => (
            <Slider
              min={40000}
              max={400000}
              step={5000}
              value={[field.value]}
              onValueChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                if (typeof next === "number") field.onChange(next);
              }}
            />
          )}
        />
      </div>

      <div className="grid gap-2">
        <Label>Visa / work authorization</Label>
        <Controller
          control={control}
          name="visaStatus"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => field.onChange(value ?? "")}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Select visa status" />
              </SelectTrigger>
              <SelectContent>
                {VISA_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.visaStatus && (
          <p className="text-xs text-destructive">{errors.visaStatus.message}</p>
        )}
      </div>

      <div className="grid gap-3">
        <Label>Choose your Superpower Tagline</Label>
        {taglines.length === 3 ? (
          <Controller
            control={control}
            name="selectedTagline"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="gap-3"
              >
                {taglines.map((tagline, index) => (
                  <label
                    key={tagline}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                      field.value === tagline
                        ? "border-[#E87A5D] bg-[#E87A5D]/10"
                        : "border-[#2B5B84]/15 bg-white hover:border-[#2B5B84]/40"
                    }`}
                  >
                    <RadioGroupItem value={tagline} className="mt-0.5" />
                    <span>
                      <span className="text-[11px] font-semibold tracking-wide text-[#E87A5D] uppercase">
                        Option {index + 1}
                      </span>
                      <span className="mt-1 block text-sm text-[#2A2D34]">
                        {tagline}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            )}
          />
        ) : (
          <p className="rounded-lg bg-[#F8F9FA] px-3 py-3 text-sm text-[#2A2D34]/65">
            Complete Step 2 so AI-suggested taglines appear here.
          </p>
        )}
        {errors.selectedTagline && (
          <p className="text-xs text-destructive">
            {errors.selectedTagline.message}
          </p>
        )}
      </div>
    </div>
  );
}
