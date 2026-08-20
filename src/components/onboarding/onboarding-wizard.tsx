"use client";

import { useState } from "react";
import { FormProvider, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

import {
  defaultOnboardingValues,
  getStepSchema,
  ONBOARDING_STEPS,
  onboardingFormSchema,
  type OnboardingFormValues,
  type OnboardingStepId,
} from "@/lib/onboarding/form-schema";
import { StepProgress } from "@/components/onboarding/step-progress";
import { WizardFooter } from "@/components/onboarding/wizard-footer";
import { StepAuth } from "@/components/onboarding/steps/step-auth";
import { StepResume } from "@/components/onboarding/steps/step-resume";
import { StepPreferences } from "@/components/onboarding/steps/step-preferences";
import { StepReferences } from "@/components/onboarding/steps/step-references";

function scrollToFirstFieldError() {
  window.requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(
      "[data-field-error], .text-destructive"
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStepId>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingLinkedIn, setIsCheckingLinkedIn] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: defaultOnboardingValues,
    mode: "onTouched",
  });

  async function validateCurrentStep() {
    const schema = getStepSchema(step);
    const values = form.getValues();
    const parsed = schema.safeParse(values);
    if (parsed.success) {
      form.clearErrors();
      return true;
    }

    for (const issue of parsed.error.issues) {
      const path = (issue.path.join(".") || "root") as FieldPath<OnboardingFormValues>;
      form.setError(path, {
        type: "manual",
        message: issue.message,
      });
    }
    const firstPath = parsed.error.issues[0]?.path.join(".");
    if (firstPath) {
      try {
        form.setFocus(firstPath as FieldPath<OnboardingFormValues>);
      } catch {
        // Some fields (e.g. selects) may not register a focusable ref.
      }
    }
    scrollToFirstFieldError();
    return false;
  }

  async function validateReferencePagesOpen() {
    const refs = form.getValues("references");
    const res = await fetch("/api/reference/validate-linkedin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: refs.map((ref) => ref.linkedInUrl) }),
    });
    const data = (await res.json()) as {
      error?: string;
      results?: Array<{
        valid: boolean;
        normalizedUrl: string;
        error: string | null;
      }>;
    };
    if (!res.ok) {
      throw new Error(data.error || "Unable to check LinkedIn profile pages");
    }

    let allOpen = true;
    (data.results ?? []).forEach((result, index) => {
      if (!result.valid) {
        allOpen = false;
        form.setError(`references.${index}.linkedInUrl`, {
          type: "manual",
          message:
            result.error ||
            "This LinkedIn page could not be opened. Check the URL.",
        });
        return;
      }
      form.clearErrors(`references.${index}.linkedInUrl`);
      form.setValue(`references.${index}.linkedInUrl`, result.normalizedUrl, {
        shouldDirty: true,
        shouldValidate: false,
      });
    });
    return allOpen;
  }

  async function handleNext() {
    setSubmitError(null);
    const ok = await validateCurrentStep();
    if (!ok) {
      setSubmitError("Please fix the highlighted fields above.");
      return;
    }

    if (step === 4) {
      setIsCheckingLinkedIn(true);
      try {
        const pagesOpen = await validateReferencePagesOpen();
        if (!pagesOpen) {
          setSubmitError(
            "One or more LinkedIn profile URLs could not be opened. Check the highlighted fields."
          );
          scrollToFirstFieldError();
          return;
        }
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "Unable to check LinkedIn profile pages"
        );
        return;
      } finally {
        setIsCheckingLinkedIn(false);
      }
    }

    if (step < ONBOARDING_STEPS.length) {
      setStep((step + 1) as OnboardingStepId);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = form.getValues();
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        warning?: string;
        referenceIndex?: number;
      };
      if (!res.ok) {
        if (typeof data.referenceIndex === "number") {
          form.setError(`references.${data.referenceIndex}.linkedInUrl`, {
            type: "manual",
            message:
              data.error ||
              "This LinkedIn page could not be opened. Check the URL.",
          });
          setSubmitError(
            "One or more LinkedIn profile URLs could not be opened. Check the highlighted fields."
          );
          scrollToFirstFieldError();
          return;
        }
        throw new Error(data.error || "Could not complete onboarding");
      }
      if (data.warning) {
        // Keep a soft signal in the URL so the dashboard can surface it.
        router.push(
          `/dashboard/candidate?onboarding=complete&warning=${encodeURIComponent(data.warning)}`
        );
        return;
      }
      router.push("/dashboard/candidate?onboarding=complete");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not complete onboarding"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep((step - 1) as OnboardingStepId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <FormProvider {...form}>
      <div className="min-h-screen bg-[#F8F9FA] text-[#2A2D34]">
        <StepProgress step={step} />
        <main className="mx-auto max-w-3xl px-6 pb-36 pt-10 sm:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28 }}
            >
              {step === 1 && <StepAuth />}
              {step === 2 && <StepResume />}
              {step === 3 && <StepPreferences />}
              {step === 4 && <StepReferences />}
            </motion.div>
          </AnimatePresence>
        </main>
        <WizardFooter
          step={step}
          isSubmitting={isSubmitting || isCheckingLinkedIn}
          error={submitError}
          onBack={handleBack}
          onNext={handleNext}
          nextLabel={
            isCheckingLinkedIn
              ? "Checking LinkedIn pages…"
              : isSubmitting
                ? "Saving…"
                : step === 4
                  ? "Complete profile"
                  : "Continue"
          }
        />
      </div>
    </FormProvider>
  );
}
