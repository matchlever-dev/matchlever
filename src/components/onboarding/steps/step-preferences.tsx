"use client";

import { Controller, useFormContext } from "react-hook-form";

import type { OnboardingFormValues } from "@/lib/onboarding/form-schema";
import {
  LOCATION_MODES,
  TIMEZONE_OPTIONS,
  VISA_OPTIONS,
} from "@/lib/onboarding/schema";
import {
  COUNTRY_OPTIONS,
  OTHER_CITY_VALUE,
  citiesForCountry,
} from "@/lib/onboarding/locations";
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
  const locationModes = watch("locationModes");
  const selectedTagline = watch("selectedTagline");
  const globalCountry = watch("globalCountry");
  const globalCity = watch("globalCity");

  const needsLocalFields =
    locationModes.includes("hybrid") || locationModes.includes("onsite");
  const cityOptions = citiesForCountry(globalCountry);
  const needsCustomCity =
    globalCountry === "Other" ||
    globalCity === OTHER_CITY_VALUE ||
    (globalCountry !== "" && cityOptions.length === 0);

  function toggleLocationMode(mode: (typeof LOCATION_MODES)[number]["value"]) {
    const next = locationModes.includes(mode)
      ? locationModes.filter((m) => m !== mode)
      : [...locationModes, mode];

    // Keep at least one mode selected.
    if (next.length === 0) return;

    setValue("locationModes", next, { shouldValidate: true });

    const stillNeedsLocal =
      next.includes("hybrid") || next.includes("onsite");
    if (!stillNeedsLocal) {
      setValue("maxCommuteMiles", null, { shouldValidate: true });
      setValue("openToRelocation", null, { shouldValidate: true });
    }
  }

  function updateTagline(index: number, value: string) {
    const next = [...taglines];
    const previous = next[index] ?? "";
    next[index] = value;
    setValue("suggestedTaglines", next, { shouldValidate: true });
    if (selectedTagline === previous || selectedTagline === "") {
      setValue("selectedTagline", value, { shouldValidate: true });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#2B5B84] sm:text-3xl">
          Work preferences
        </h2>
        <p className="mt-2 text-sm text-[#2A2D34]/70 sm:text-base">
          Tell hirers where you can work, how far you can commute, and which
          Superpower Tagline leads your card.
        </p>
      </div>

      <fieldset className="space-y-3">
        <Label>Location mode</Label>
        <p className="text-xs text-[#2A2D34]/60">Select all that apply.</p>
        <div className="grid grid-cols-3 gap-2">
          {LOCATION_MODES.map((mode) => {
            const selected = locationModes.includes(mode.value);
            return (
              <button
                key={mode.value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleLocationMode(mode.value)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  selected
                    ? "border-[#2B5B84] bg-[#2B5B84] text-white"
                    : "border-[#2B5B84]/20 bg-white text-[#2A2D34] hover:border-[#2B5B84]/50"
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
        {errors.locationModes && (
          <p className="text-xs text-destructive">
            {errors.locationModes.message}
          </p>
        )}
      </fieldset>

      {needsLocalFields && (
        <div className="grid gap-4 rounded-xl border border-[#2B5B84]/15 bg-[#F8F9FA] p-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="maxCommuteMiles">Max commute (miles)</Label>
            <Input
              id="maxCommuteMiles"
              type="number"
              min={1}
              max={500}
              placeholder="e.g. 30"
              value={watch("maxCommuteMiles") ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                setValue(
                  "maxCommuteMiles",
                  raw === "" ? null : Number(raw),
                  { shouldValidate: true }
                );
              }}
            />
            {errors.maxCommuteMiles && (
              <p className="text-xs text-destructive">
                {errors.maxCommuteMiles.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Open to relocation?</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: true, label: "Yes" },
                { value: false, label: "No" },
              ].map((option) => {
                const selected = watch("openToRelocation") === option.value;
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setValue("openToRelocation", option.value, {
                        shouldValidate: true,
                      })
                    }
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                      selected
                        ? "border-[#2B5B84] bg-[#2B5B84] text-white"
                        : "border-[#2B5B84]/20 bg-white text-[#2A2D34] hover:border-[#2B5B84]/50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {errors.openToRelocation && (
              <p className="text-xs text-destructive">
                {errors.openToRelocation.message}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Country</Label>
          <Controller
            control={control}
            name="globalCountry"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={(value) => {
                  const next = value ?? "";
                  field.onChange(next);
                  if (next === "Other") {
                    setValue("globalCity", OTHER_CITY_VALUE, {
                      shouldValidate: true,
                    });
                  } else {
                    setValue("globalCity", "", { shouldValidate: true });
                  }
                  setValue("customCity", "", { shouldValidate: true });
                }}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.globalCountry && (
            <p className="text-xs text-destructive">
              {errors.globalCountry.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label>Closest city</Label>
          {globalCountry && cityOptions.length > 0 ? (
            <Controller
              control={control}
              name="globalCity"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(value) => {
                    const next = value ?? "";
                    field.onChange(next);
                    if (next !== OTHER_CITY_VALUE) {
                      setValue("customCity", "", { shouldValidate: true });
                    }
                  }}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Select closest city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cityOptions.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                    <SelectItem value={OTHER_CITY_VALUE}>
                      Other / type my city
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          ) : (
            <Input
              id="customCityOnly"
              placeholder="e.g. Lisbon"
              value={watch("customCity") ?? ""}
              onChange={(e) => {
                setValue("customCity", e.target.value, {
                  shouldValidate: true,
                });
                setValue("globalCity", OTHER_CITY_VALUE, {
                  shouldValidate: true,
                });
              }}
              disabled={!globalCountry}
            />
          )}
          {errors.globalCity && !needsCustomCity && (
            <p className="text-xs text-destructive">
              {errors.globalCity.message}
            </p>
          )}
        </div>
      </div>

      {needsCustomCity && globalCountry && cityOptions.length > 0 && (
        <div className="grid gap-2">
          <Label htmlFor="customCity">Type your closest city</Label>
          <Input
            id="customCity"
            placeholder="City or metro area"
            {...register("customCity")}
          />
          {errors.customCity && (
            <p className="text-xs text-destructive">
              {errors.customCity.message}
            </p>
          )}
        </div>
      )}
      {needsCustomCity && globalCountry && cityOptions.length === 0 && (
        <>
          {errors.customCity && (
            <p className="text-xs text-destructive">
              {errors.customCity.message}
            </p>
          )}
        </>
      )}

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
        <div>
          <Label>Superpower Taglines</Label>
          <p className="mt-1 text-xs text-[#2A2D34]/60">
            Edit the AI suggestions, then select the one that leads your card.
          </p>
        </div>
        {taglines.length === 3 ? (
          <Controller
            control={control}
            name="selectedTagline"
            render={({ field }) => {
              const selectedIndex = Math.max(
                0,
                taglines.findIndex((t) => t === field.value)
              );
              return (
                <RadioGroup
                  value={String(selectedIndex)}
                  onValueChange={(value) => {
                    const index = Number(value);
                    field.onChange(taglines[index] ?? "");
                  }}
                  className="gap-3"
                >
                  {taglines.map((tagline, index) => (
                    <label
                      key={`tagline-${index}`}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                        selectedIndex === index
                          ? "border-[#E87A5D] bg-[#E87A5D]/10"
                          : "border-[#2B5B84]/15 bg-white hover:border-[#2B5B84]/40"
                      }`}
                    >
                      <RadioGroupItem
                        value={String(index)}
                        className="mt-2.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-[11px] font-semibold tracking-wide text-[#E87A5D] uppercase">
                          Option {index + 1}
                        </span>
                        <Input
                          value={tagline}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateTagline(index, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 bg-white"
                          maxLength={160}
                        />
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              );
            }}
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
        {errors.suggestedTaglines && (
          <p className="text-xs text-destructive">
            {errors.suggestedTaglines.message as string}
          </p>
        )}
      </div>
    </div>
  );
}
