"use client";

import { useCallback, useState } from "react";
import { useFormContext } from "react-hook-form";
import { FileUp, Loader2 } from "lucide-react";

import type { OnboardingFormValues } from "@/lib/onboarding/form-schema";

type SanitizeResponse = {
  anonymous_title: string;
  sanitized_summary: string;
  verified_skills: string[];
  years_experience: number;
  suggested_taglines: string[];
  error?: string;
};

export function StepResume() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "extracting" | "done" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileName = watch("resumeFileName");
  const anonymousTitle = watch("anonymousTitle");
  const skills = watch("verifiedSkills");
  const taglines = watch("suggestedTaglines");

  const uploadResume = useCallback(
    async (file: File) => {
      setStatus("extracting");
      setErrorMessage(null);
      setValue("resumeFileName", file.name, { shouldValidate: true });

      const body = new FormData();
      body.append("resume", file);

      try {
        const res = await fetch("/api/candidate/sanitize", {
          method: "POST",
          body,
        });
        const data = (await res.json()) as SanitizeResponse;
        if (!res.ok) {
          throw new Error(data.error || "Sanitize failed");
        }

        setValue("anonymousTitle", data.anonymous_title);
        setValue("sanitizedSummary", data.sanitized_summary);
        setValue("verifiedSkills", data.verified_skills);
        setValue("yearsExperience", data.years_experience);
        setValue("suggestedTaglines", data.suggested_taglines, {
          shouldValidate: true,
        });
        setValue("selectedTagline", data.suggested_taglines[0] ?? "", {
          shouldValidate: true,
        });
        setStatus("done");
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Could not sanitize resume"
        );
        setValue("suggestedTaglines", [], { shouldValidate: true });
      }
    },
    [setValue]
  );

  function onFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    void uploadResume(file);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#2B5B84] sm:text-3xl">
          Sanitize your résumé
        </h2>
        <p className="mt-2 text-sm text-[#2A2D34]/70 sm:text-base">
          Drop a PDF or DOCX. We extract signal, strip PII, and draft three
          Superpower Taglines.
        </p>
      </div>

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
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center transition ${
          dragging
            ? "border-[#E87A5D] bg-[#E87A5D]/10"
            : "border-[#2B5B84]/30 bg-white hover:border-[#2B5B84]"
        }`}
      >
        <input
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={(e) => onFileChange(e.target.files)}
        />
        <FileUp className="size-8 text-[#2B5B84]" />
        <div>
          <p className="text-sm font-medium text-[#2A2D34]">
            {fileName || "Drop résumé here, or click to browse"}
          </p>
          <p className="mt-1 text-xs text-[#2A2D34]/55">PDF or DOCX · max 10MB</p>
        </div>
      </label>

      {errors.resumeFileName && (
        <p className="text-xs text-destructive">{errors.resumeFileName.message}</p>
      )}
      {errors.suggestedTaglines && (
        <p className="text-xs text-destructive">
          {errors.suggestedTaglines.message as string}
        </p>
      )}
      {errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}

      {status === "extracting" && <ExtractionSkeleton />}

      {status === "done" && (
        <div className="space-y-4 rounded-xl border border-[#2B5B84]/15 bg-white p-5">
          <p className="text-xs font-semibold tracking-wide text-[#E87A5D] uppercase">
            Extraction complete
          </p>
          <h3 className="text-lg font-semibold text-[#2B5B84]">
            {anonymousTitle}
          </h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-md bg-[#2B5B84]/10 px-2 py-1 text-xs font-medium text-[#2B5B84]"
              >
                {skill}
              </span>
            ))}
          </div>
          <ul className="space-y-2">
            {taglines.map((line) => (
              <li
                key={line}
                className="rounded-lg bg-[#F8F9FA] px-3 py-2 text-sm text-[#2A2D34]"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ExtractionSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-[#2B5B84]/15 bg-white p-5">
      <div className="flex items-center gap-2 text-sm text-[#2B5B84]">
        <Loader2 className="size-4 animate-spin" />
        Extracting & sanitizing in real time…
      </div>
      <div className="h-4 w-2/3 animate-pulse rounded bg-[#2B5B84]/15" />
      <div className="h-3 w-full animate-pulse rounded bg-[#2B5B84]/10" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-[#2B5B84]/10" />
      <div className="flex gap-2 pt-2">
        <div className="h-6 w-16 animate-pulse rounded bg-[#E87A5D]/20" />
        <div className="h-6 w-20 animate-pulse rounded bg-[#E87A5D]/20" />
        <div className="h-6 w-14 animate-pulse rounded bg-[#E87A5D]/20" />
      </div>
      <div className="h-10 w-full animate-pulse rounded bg-[#2B5B84]/10" />
      <div className="h-10 w-full animate-pulse rounded bg-[#2B5B84]/10" />
      <div className="h-10 w-full animate-pulse rounded bg-[#2B5B84]/10" />
    </div>
  );
}
