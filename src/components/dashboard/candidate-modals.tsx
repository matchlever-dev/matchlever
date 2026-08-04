"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileUp, Loader2 } from "lucide-react";

import {
  formatTimezoneOffset,
  offsetHoursInputToMinutes,
  offsetMinutesToHoursInput,
  type CandidateDashboardData,
} from "@/lib/dashboard/candidate";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const editSchema = z.object({
  headline: z.string().trim().min(2).max(120),
  selectedTagline: z.string().trim().min(8).max(200),
  globalCity: z.string().trim().min(1).max(80),
  globalCountry: z.string().trim().min(1).max(80),
  timezoneOffset: z.string(),
  verifiedSkills: z.string(),
});

type EditValues = z.infer<typeof editSchema>;

type SanitizeResponse = {
  anonymous_title: string;
  sanitized_summary: string;
  verified_skills: string[];
  years_experience: number;
  suggested_taglines: string[];
  error?: string;
};

export function EditProfileModal({
  open,
  onOpenChange,
  data,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CandidateDashboardData;
  onSaved: (next: Partial<CandidateDashboardData>) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [suggestedTaglines, setSuggestedTaglines] = useState<string[]>([]);
  const [sanitizedSummary, setSanitizedSummary] = useState<string | null>(null);
  const [yearsExperience, setYearsExperience] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: toFormValues(data),
  });

  const selectedTagline = watch("selectedTagline");

  useEffect(() => {
    if (open) {
      reset(toFormValues(data));
      setError(null);
      setResumeName(null);
      setSuggestedTaglines([]);
      setSanitizedSummary(null);
      setYearsExperience(null);
      setResumeBusy(false);
      setDragging(false);
    }
  }, [open, data, reset]);

  async function uploadResume(file: File) {
    setResumeBusy(true);
    setError(null);
    setResumeName(file.name);

    const body = new FormData();
    body.append("resume", file);

    try {
      const res = await fetch("/api/candidate/sanitize", {
        method: "POST",
        body,
      });
      const raw = await res.text();
      let json: SanitizeResponse;
      try {
        json = JSON.parse(raw) as SanitizeResponse;
      } catch {
        throw new Error(
          res.ok
            ? "Resume API returned an unexpected response."
            : `Resume sanitize failed (${res.status}).`
        );
      }
      if (!res.ok) {
        throw new Error(json.error || "Unable to sanitize resume");
      }

      const taglines = json.suggested_taglines ?? [];
      setSuggestedTaglines(taglines);
      setSanitizedSummary(json.sanitized_summary ?? null);
      setYearsExperience(
        typeof json.years_experience === "number" ? json.years_experience : null
      );
      setValue("headline", json.anonymous_title || "", {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue("verifiedSkills", (json.verified_skills ?? []).join(", "), {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue("selectedTagline", taglines[0] ?? "", {
        shouldValidate: true,
        shouldDirty: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sanitize resume");
      setResumeName(null);
    } finally {
      setResumeBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    void uploadResume(file);
  }

  async function onSubmit(values: EditValues) {
    setError(null);
    const offset =
      values.timezoneOffset.trim() === ""
        ? null
        : offsetHoursInputToMinutes(values.timezoneOffset);
    if (values.timezoneOffset.trim() !== "" && offset === null) {
      setError("Timezone offset must be hours from UTC (e.g. -8 or +5.5).");
      return;
    }
    const verifiedSkills = values.verifiedSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch("/api/dashboard/candidate/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: values.headline,
        selectedTagline: values.selectedTagline,
        globalCity: values.globalCity,
        globalCountry: values.globalCountry,
        timezoneOffset: offset,
        verifiedSkills,
        ...(suggestedTaglines.length > 0
          ? { suggestedTaglines }
          : {}),
        ...(sanitizedSummary !== null ? { sanitizedSummary } : {}),
        ...(yearsExperience !== null ? { yearsExperience } : {}),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Unable to save profile");
      return;
    }
    onOpenChange(false);
    onSaved({
      headline: values.headline,
      selectedTagline: values.selectedTagline,
      globalCity: values.globalCity,
      globalCountry: values.globalCountry,
      timezoneOffset: offset,
      timezoneLabel: formatTimezoneOffset(offset),
      verifiedSkills,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#2B5B84]">Edit profile</DialogTitle>
          <DialogDescription>
            Update the anonymous employer-facing card details, or reload a new
            resume to refresh headline, skills, and taglines.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label>Reload resume</Label>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                onFileChange(e.dataTransfer.files);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition ${
                dragging
                  ? "border-[#E87A5D] bg-[#E87A5D]/10"
                  : "border-[#2B5B84]/30 bg-[#F7F6F3] hover:border-[#2B5B84]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                disabled={resumeBusy || isSubmitting}
                onChange={(e) => onFileChange(e.target.files)}
              />
              {resumeBusy ? (
                <Loader2 className="size-5 animate-spin text-[#2B5B84]" />
              ) : (
                <FileUp className="size-5 text-[#2B5B84]" />
              )}
              <div>
                <p className="text-sm font-medium text-[#2A2D34]">
                  {resumeBusy
                    ? "Extracting & sanitizing…"
                    : resumeName || "Drop a new PDF or DOCX, or click to browse"}
                </p>
                <p className="mt-1 text-xs text-[#2A2D34]/55">
                  Prefills headline, skills, and Superpower Taglines
                </p>
              </div>
            </label>
          </div>

          <Field label="Headline" id="headline">
            <Input id="headline" {...register("headline")} />
          </Field>
          <Field label="Selected tagline" id="selectedTagline">
            <Textarea
              id="selectedTagline"
              rows={3}
              {...register("selectedTagline")}
            />
          </Field>
          {suggestedTaglines.length > 0 && (
            <div className="grid gap-2">
              <Label>Suggested taglines from resume</Label>
              <ul className="space-y-2">
                {suggestedTaglines.map((line) => {
                  const selected = selectedTagline === line;
                  return (
                    <li key={line}>
                      <button
                        type="button"
                        onClick={() =>
                          setValue("selectedTagline", line, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                          selected
                            ? "border-[#2B5B84] bg-[#2B5B84]/10 text-[#2B5B84]"
                            : "border-[#2B5B84]/15 bg-white text-[#2A2D34] hover:border-[#2B5B84]/40"
                        }`}
                      >
                        {line}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Closest city" id="globalCity">
              <Input id="globalCity" {...register("globalCity")} />
            </Field>
            <Field label="Country" id="globalCountry">
              <Input id="globalCountry" {...register("globalCountry")} />
            </Field>
          </div>
          <Field label="Timezone offset (hours from UTC)" id="timezoneOffset">
            <Input
              id="timezoneOffset"
              placeholder="-8"
              inputMode="decimal"
              {...register("timezoneOffset")}
            />
          </Field>
          <Field label="Verified skills (comma-separated)" id="verifiedSkills">
            <Input
              id="verifiedSkills"
              placeholder="TypeScript, PostgreSQL"
              {...register("verifiedSkills")}
            />
          </Field>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter className="mx-0 mb-0 border-0 bg-transparent p-0">
            <Button
              type="submit"
              disabled={isSubmitting || resumeBusy}
              className="bg-[#2B5B84] text-white hover:bg-[#244e71]"
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/candidate/profile", {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      onOpenChange(false);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setConfirmText("");
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#2B5B84]">Delete account</DialogTitle>
          <DialogDescription>
            This permanently removes your candidate profile and reference data.
            Type <strong>DELETE</strong> to confirm.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="h-11"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter className="mx-0 mb-0 border-0 bg-transparent p-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={confirmText !== "DELETE" || busy}
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => void onDelete()}
          >
            {busy ? "Deleting…" : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function toFormValues(data: CandidateDashboardData): EditValues {
  return {
    headline: data.headline,
    selectedTagline: data.selectedTagline,
    globalCity: data.globalCity,
    globalCountry: data.globalCountry,
    timezoneOffset: offsetMinutesToHoursInput(data.timezoneOffset),
    verifiedSkills: data.verifiedSkills.join(", "),
  };
}
