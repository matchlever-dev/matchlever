"use client";

import { useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileUp, Loader2, X } from "lucide-react";

import {
  defaultJobOpeningValues,
  jobOpeningFormSchema,
  type JobOpeningFormValues,
} from "@/lib/employer/job-opening-schema";
import { founderPromoBannerCopy } from "@/lib/employer/billing";
import {
  COUNTRY_OPTIONS,
  OTHER_CITY_VALUE,
  citiesForCountry,
} from "@/lib/onboarding/locations";
import {
  LOCATION_MODES,
  TIMEZONE_OPTIONS,
  VISA_OPTIONS,
} from "@/lib/onboarding/schema";
import { groupSuperpowersByCategory } from "@/lib/reference/taxonomy";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";

type JobOpeningFormProps = {
  initialValues?: Partial<JobOpeningFormValues>;
  jobId?: string | null;
  founderEligible?: boolean;
  employerCreatedAt?: string;
  freeMatchesUsed?: number;
  onSaved?: (result: { id: string; status: string }) => void;
};

export function JobOpeningForm({
  initialValues,
  jobId = null,
  founderEligible,
  employerCreatedAt,
  freeMatchesUsed = 0,
  onSaved,
}: JobOpeningFormProps) {
  const [skillDraft, setSkillDraft] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"draft" | "publish" | null>(
    null
  );
  const [parseBusy, setParseBusy] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseFileName, setParseFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<JobOpeningFormValues>({
    resolver: zodResolver(jobOpeningFormSchema),
    defaultValues: { ...defaultJobOpeningValues, ...initialValues },
    mode: "onTouched",
  });

  const {
    register,
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = form;

  const locationModes = watch("locationModes");
  const endorsedSkills = watch("endorsedSkills");
  const verifiedSkills = watch("verifiedSkills");
  const taglines = watch("suggestedTaglines");
  const visaStatuses = watch("visaStatuses");
  const globalCountry = watch("globalCountry") ?? "";
  const globalCity = watch("globalCity") ?? "";
  const minSalary = watch("minSalary");
  const description = watch("description") ?? "";

  const needsLocal =
    locationModes.includes("hybrid") || locationModes.includes("onsite");
  const cityOptions = citiesForCountry(globalCountry);
  const needsCustomCity =
    globalCountry === "Other" ||
    globalCity === OTHER_CITY_VALUE ||
    (globalCountry !== "" && cityOptions.length === 0);
  const groups = useMemo(() => groupSuperpowersByCategory(), []);

  const promoCopy =
    typeof founderEligible === "boolean"
      ? founderEligible
        ? "2026 Founder Special: Your first accepted match is $0!"
        : null
      : employerCreatedAt
        ? founderPromoBannerCopy({
            createdAt: employerCreatedAt,
            freeMatchesUsed,
          })
        : null;

  async function parseJobFile(file: File) {
    setParseBusy(true);
    setParseError(null);
    setParseFileName(file.name);
    try {
      const body = new FormData();
      body.append("jobDescription", file);
      const res = await fetch("/api/employer/jobs/parse", {
        method: "POST",
        body,
      });
      const json = (await res.json()) as {
        error?: string;
        formValues?: JobOpeningFormValues;
      };
      if (!res.ok || !json.formValues) {
        throw new Error(json.error || "Unable to parse job description");
      }
      reset({ ...defaultJobOpeningValues, ...json.formValues });
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Unable to parse job description"
      );
      setParseFileName(null);
    } finally {
      setParseBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onFileList(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    void parseJobFile(file);
  }

  function toggleLocationMode(mode: (typeof LOCATION_MODES)[number]["value"]) {
    const next = locationModes.includes(mode)
      ? locationModes.filter((item) => item !== mode)
      : [...locationModes, mode];
    if (next.length === 0) return;
    setValue("locationModes", next, { shouldValidate: true });
    if (!next.includes("hybrid") && !next.includes("onsite")) {
      setValue("maxCommuteMiles", null, { shouldValidate: true });
      setValue("openToRelocation", null, { shouldValidate: true });
    }
  }

  function toggleEndorsedSkill(id: (typeof endorsedSkills)[number]) {
    const set = new Set(endorsedSkills);
    if (set.has(id)) set.delete(id);
    else if (set.size < 7) set.add(id);
    setValue("endorsedSkills", [...set] as JobOpeningFormValues["endorsedSkills"], {
      shouldValidate: true,
    });
  }

  function toggleVisa(value: (typeof VISA_OPTIONS)[number]["value"]) {
    const set = new Set(visaStatuses);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    const next = [...set] as JobOpeningFormValues["visaStatuses"];
    setValue("visaStatuses", next, { shouldValidate: true });
  }

  function addSkill(raw: string) {
    const skill = raw.trim();
    if (!skill) return;
    if (verifiedSkills.some((item) => item.toLowerCase() === skill.toLowerCase())) {
      setSkillDraft("");
      return;
    }
    setValue("verifiedSkills", [...verifiedSkills, skill], {
      shouldValidate: true,
    });
    setSkillDraft("");
  }

  function removeSkill(skill: string) {
    setValue(
      "verifiedSkills",
      verifiedSkills.filter((item) => item !== skill),
      { shouldValidate: true }
    );
  }

  async function submit(status: "draft" | "active") {
    setSubmitError(null);
    setBusyAction(status === "draft" ? "draft" : "publish");
    try {
      const values = form.getValues();
      const parsed = jobOpeningFormSchema.safeParse(values);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const path = issue.path.join(".") || "root";
          form.setError(path as keyof JobOpeningFormValues, {
            type: "manual",
            message: issue.message,
          });
        }
        throw new Error(parsed.error.issues[0]?.message || "Fix form errors");
      }

      const endpoint = jobId
        ? `/api/employer/jobs/${jobId}`
        : "/api/employer/jobs";
      const res = await fetch(endpoint, {
        method: jobId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, status }),
      });
      const json = (await res.json()) as {
        error?: string;
        id?: string;
        status?: string;
      };
      if (!res.ok) throw new Error(json.error || "Unable to save job opening");
      onSaved?.({
        id: json.id || jobId || "",
        status: json.status || status,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to save");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <form
      className="relative pb-28"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit(() => submit("active"))();
      }}
    >
      <div className="space-y-6">
        <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
          <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
            Job description upload
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold text-[#2B5B84]">
            Autofill from JD
          </h2>
          <p className="mt-2 text-sm text-[#5B616B]">
            Upload a PDF, DOCX, or HTML job description. We extract text and
            populate title, skills, taglines, endorsed traits, location, salary,
            and visa fields. Review everything before publishing.
          </p>

          <label
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              onFileList(event.dataTransfer.files);
            }}
            className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-10 text-center transition ${
              dragging
                ? "border-[#2B5B84] bg-[#2B5B84]/8"
                : "border-[#2B5B84]/25 bg-[#F7F6F3]"
            }`}
          >
            {parseBusy ? (
              <Loader2 className="size-8 animate-spin text-[#2B5B84]" />
            ) : (
              <FileUp className="size-8 text-[#2B5B84]" />
            )}
            <div>
              <p className="text-sm font-medium text-[#2A2D34]">
                {parseBusy
                  ? "Parsing job description…"
                  : parseFileName
                    ? `Parsed ${parseFileName}`
                    : "Drop JD here or click to upload"}
              </p>
              <p className="mt-1 text-xs text-[#5B616B]">
                PDF, DOCX, or HTML · max 10 MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.html,.htm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/html"
              className="sr-only"
              disabled={parseBusy}
              onChange={(event) => onFileList(event.target.files)}
            />
          </label>

          {parseError ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {parseError}
            </p>
          ) : null}

          {description ? (
            <div className="mt-5 grid gap-2">
              <Label htmlFor="job-description">Extracted description</Label>
              <Textarea
                id="job-description"
                rows={6}
                className="min-h-32 text-sm"
                {...register("description")}
              />
              <p className="text-xs text-[#5B616B]">
                Stored with the job opening for matching context. Edit freely.
              </p>
            </div>
          ) : null}
        </section>

        <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
          <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
            Section 1 · Core Profile
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold text-[#2B5B84]">
            Role requirements
          </h2>

          <div className="mt-6 grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="job-title">Job title</Label>
              <Input
                id="job-title"
                placeholder="Senior Platform Engineer"
                className="h-11"
                {...register("title")}
              />
              {errors.title ? (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="verified-skill">Verified skills</Label>
              <div className="flex flex-wrap gap-2">
                {verifiedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-md border border-[#2B5B84]/20 bg-[#2B5B84]/8 px-2.5 py-1 text-sm text-[#2B5B84]"
                  >
                    {skill}
                    <button
                      type="button"
                      aria-label={`Remove ${skill}`}
                      onClick={() => removeSkill(skill)}
                      className="rounded p-0.5 hover:bg-[#2B5B84]/15"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="verified-skill"
                  value={skillDraft}
                  placeholder="Type a skill and press Enter"
                  className="h-11"
                  onChange={(event) => setSkillDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addSkill(skillDraft);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-[#2B5B84]/25 text-[#2B5B84]"
                  onClick={() => addSkill(skillDraft)}
                >
                  Add
                </Button>
              </div>
              {errors.verifiedSkills ? (
                <p className="text-xs text-destructive">
                  {errors.verifiedSkills.message as string}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="yearsExperience">Years of experience</Label>
              <Input
                id="yearsExperience"
                type="number"
                min={0}
                max={40}
                className="h-11 max-w-[10rem]"
                {...register("yearsExperience", { valueAsNumber: true })}
              />
              <p className="text-xs text-[#5B616B]">0–20+ (up to 40 stored)</p>
              {errors.yearsExperience ? (
                <p className="text-xs text-destructive">
                  {errors.yearsExperience.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4">
              <Label>3 Superpower Taglines</Label>
              {[0, 1, 2].map((index) => (
                <div key={index} className="grid gap-1.5">
                  <Input
                    maxLength={60}
                    placeholder={`Tagline ${index + 1}`}
                    className="h-11"
                    value={taglines[index] ?? ""}
                    onChange={(event) => {
                      const next = [...taglines] as [
                        string,
                        string,
                        string,
                      ];
                      next[index] = event.target.value.slice(0, 60);
                      setValue("suggestedTaglines", next, {
                        shouldValidate: true,
                      });
                    }}
                  />
                  <div className="flex justify-between text-xs text-[#5B616B]">
                    <span>
                      {Array.isArray(errors.suggestedTaglines)
                        ? errors.suggestedTaglines[index]?.message
                        : errors.suggestedTaglines?.message || "\u00a0"}
                    </span>
                    <span>{(taglines[index] ?? "").length}/60</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
                Section 2 · Endorsed Skills
              </p>
              <h2 className="mt-2 font-display text-xl font-semibold text-[#2B5B84]">
                Must-have superpowers
              </h2>
              <p className="mt-2 text-sm text-[#5B616B]">
                Mirror the reference taxonomy. Select up to 7 traits.
              </p>
            </div>
            <span
              className={`shrink-0 rounded-md px-2.5 py-1.5 font-display text-[11px] font-bold tracking-wide uppercase ${
                endorsedSkills.length >= 7
                  ? "bg-[#2B5B84] text-white"
                  : "bg-[#E87A5D]/15 text-[#E87A5D]"
              }`}
            >
              Selected: {endorsedSkills.length}/7
            </span>
          </div>

          <div className="mt-6 space-y-5">
            {groups.map((group) => (
              <div key={group.category}>
                <p className="mb-2 font-display text-sm font-bold text-[#2A2D34]">
                  {group.category}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {group.options.map((option) => {
                    const isOn = endorsedSkills.includes(option.id);
                    const disabled = !isOn && endorsedSkills.length >= 7;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleEndorsedSkill(option.id)}
                        className={`min-h-11 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition ${
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
          {errors.endorsedSkills ? (
            <p className="mt-3 text-xs text-destructive">
              {errors.endorsedSkills.message as string}
            </p>
          ) : null}
        </section>

        <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
          <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
            Section 3 · Preferences & Logistics
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold text-[#2B5B84]">
            Where and how this role works
          </h2>

          <fieldset className="mt-6 space-y-3">
            <Label>Location mode</Label>
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
          </fieldset>

          {needsLocal ? (
            <div className="mt-6 space-y-5 rounded-lg border border-[#2B5B84]/12 bg-[#F7F6F3] p-4">
              <div className="grid gap-2">
                <Label htmlFor="maxCommuteMiles">Max commute (miles)</Label>
                <Controller
                  control={control}
                  name="maxCommuteMiles"
                  render={({ field }) => (
                    <div className="space-y-3">
                      <Slider
                        min={1}
                        max={100}
                        step={1}
                        value={[field.value ?? 30]}
                        onValueChange={(value) => {
                          const next = Array.isArray(value) ? value[0] : value;
                          if (typeof next === "number") field.onChange(next);
                        }}
                      />
                      <Input
                        id="maxCommuteMiles"
                        type="number"
                        min={1}
                        max={500}
                        className="h-11 max-w-[8rem]"
                        value={field.value ?? ""}
                        onChange={(event) => {
                          const raw = event.target.value;
                          field.onChange(raw === "" ? null : Number(raw));
                        }}
                      />
                    </div>
                  )}
                />
              </div>

              <div className="grid gap-2">
                <Label>Open to relocation?</Label>
                <Controller
                  control={control}
                  name="openToRelocation"
                  render={({ field }) => (
                    <RadioGroup
                      value={
                        field.value == null
                          ? ""
                          : field.value
                            ? "yes"
                            : "no"
                      }
                      onValueChange={(value) =>
                        field.onChange(value === "yes")
                      }
                      className="flex gap-4"
                    >
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="yes" />
                        Yes
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="no" />
                        No
                      </label>
                    </RadioGroup>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Country</Label>
                  <Select
                    value={globalCountry || undefined}
                    onValueChange={(value) => {
                      setValue("globalCountry", value ?? "", {
                        shouldValidate: true,
                      });
                      setValue("globalCity", "", { shouldValidate: true });
                    }}
                  >
                    <SelectTrigger className="h-11">
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
                </div>
                <div className="grid gap-2">
                  <Label>Closest city</Label>
                  {needsCustomCity ? (
                    <Input
                      placeholder="City or metro area"
                      className="h-11"
                      {...register("customCity")}
                    />
                  ) : (
                    <Select
                      value={globalCity || undefined}
                      onValueChange={(value) =>
                        setValue("globalCity", value ?? "", {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select closest city" />
                      </SelectTrigger>
                      <SelectContent>
                        {cityOptions.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                        <SelectItem value={OTHER_CITY_VALUE}>Other…</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label>Timezone</Label>
              <Controller
                control={control}
                name="timezone"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger className="h-11">
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
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workHoursStart">Work hours start</Label>
              <Input
                id="workHoursStart"
                type="time"
                className="h-11"
                {...register("workHoursStart")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workHoursEnd">Work hours end</Label>
              <Input
                id="workHoursEnd"
                type="time"
                className="h-11"
                {...register("workHoursEnd")}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="minSalary">Minimum salary (USD)</Label>
              <div className="relative max-w-xs">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#5B616B]">
                  $
                </span>
                <Input
                  id="minSalary"
                  type="number"
                  min={40000}
                  max={400000}
                  step={1000}
                  className="h-11 pl-7"
                  {...register("minSalary", { valueAsNumber: true })}
                />
              </div>
              <p className="text-xs text-[#5B616B]">
                Current: ${Number(minSalary || 0).toLocaleString()} · Allowed
                $40,000–$400,000
              </p>
              {errors.minSalary ? (
                <p className="text-xs text-destructive">
                  {errors.minSalary.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-2">
            <Label>Visa / work authorization</Label>
            <p className="text-xs text-[#5B616B]">Select all that apply.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {VISA_OPTIONS.map((option) => {
                const selected = visaStatuses.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleVisa(option.value)}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition ${
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
            {errors.visaStatuses ? (
              <p className="text-xs text-destructive">
                {errors.visaStatuses.message as string}
              </p>
            ) : null}
          </div>
        </section>

        <div className="rounded-lg border border-[#2B5B84]/15 bg-[#2B5B84]/5 px-4 py-3 text-sm text-[#2A2D34]">
          Posting is Free. You only pay $600 when you accept a candidate match
          (covers up to 5 matches per role).
          {promoCopy ? (
            <span className="mt-1 block font-medium text-[#E87A5D]">
              {promoCopy}
            </span>
          ) : null}
        </div>

        {submitError ? (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#2B5B84]/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-end gap-3 px-5 py-3 sm:px-8">
          <Button
            type="button"
            variant="outline"
            className="h-11 border-[#2B5B84]/25 text-[#2B5B84]"
            disabled={busyAction !== null || parseBusy}
            onClick={() => void submit("draft")}
          >
            {busyAction === "draft" ? "Saving…" : "Save as Draft"}
          </Button>
          <Button
            type="submit"
            className="h-11 bg-[#2B5B84] text-white hover:bg-[#244d70]"
            disabled={busyAction !== null || parseBusy}
          >
            {busyAction === "publish" ? "Publishing…" : "Publish Job Opening"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** Lightweight edit-profile toggle used by the dashboard header. */
export function EditEmployerProfileFields({
  title,
  companyName,
  onSave,
}: {
  title: string;
  companyName: string;
  onSave: (values: { title: string; companyName: string }) => Promise<void>;
}) {
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftCompany, setDraftCompany] = useState(companyName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="edit-company">Company name</Label>
        <Input
          id="edit-company"
          value={draftCompany}
          onChange={(event) => setDraftCompany(event.target.value)}
          className="h-11"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-title">Your title</Label>
        <Input
          id="edit-title"
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          className="h-11"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="button"
        className="h-10 bg-[#2B5B84] text-white hover:bg-[#244d70]"
        disabled={busy || !draftTitle.trim() || !draftCompany.trim()}
        onClick={() => {
          setBusy(true);
          setError(null);
          void onSave({
            title: draftTitle.trim(),
            companyName: draftCompany.trim(),
          })
            .catch((err) =>
              setError(err instanceof Error ? err.message : "Save failed")
            )
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "Saving…" : "Save profile"}
      </Button>
    </div>
  );
}
