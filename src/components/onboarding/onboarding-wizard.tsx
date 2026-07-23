"use client";

import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
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

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStepId>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      const path = issue.path.join(".") || "root";
      form.setError(path as keyof OnboardingFormValues, {
        type: "manual",
        message: issue.message,
      });
    }
    return false;
  }

  async function handleNext() {
    setSubmitError(null);
    const ok = await validateCurrentStep();
    if (!ok) return;

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
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Could not complete onboarding");
      }
      router.push("/?onboarding=complete");
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
        <main className="mx-auto max-w-3xl px-6 pb-28 pt-10 sm:px-8">
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
          {submitError && (
            <p className="mt-6 text-sm text-destructive">{submitError}</p>
          )}
        </main>
        <WizardFooter
          step={step}
          isSubmitting={isSubmitting}
          onBack={handleBack}
          onNext={handleNext}
          nextLabel={step === 4 ? "Complete profile" : "Continue"}
        />
      </div>
    </FormProvider>
  );
}
