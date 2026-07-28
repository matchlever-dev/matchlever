"use client";

import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";

import {
  defaultReferenceFormValues,
  referenceFormSchema,
  type ReferenceFormValues,
} from "@/lib/reference/schema";
import { BrandMark } from "@/components/brand/brand-mark";
import { ReferrerSeekerCta } from "@/components/reference/referrer-seeker-cta";
import { Progress } from "@/components/ui/progress";
import {
  StepEndorsement,
  StepIdentity,
  StepRatings,
  StepSuperpowers,
} from "@/components/reference/steps";

type Invite = {
  token: string;
  status: string;
  relationship: string | null;
  reference_name: string | null;
  candidate_title: string;
  candidate_tagline: string;
  demo?: boolean;
};

const STEPS = [
  { id: 1, title: "Identity" },
  { id: 2, title: "Superpowers" },
  { id: 3, title: "Ratings" },
  { id: 4, title: "Endorsement" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function ReferenceVerificationWizard({ token }: { token: string }) {
  const [step, setStep] = useState<StepId>(1);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    authenticity_score: number;
  } | null>(null);

  const form = useForm<ReferenceFormValues>({
    resolver: zodResolver(referenceFormSchema),
    defaultValues: defaultReferenceFormValues,
    mode: "onTouched",
  });

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/reference/${token}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Invite not found");
        }
        if (!active) return;
        setInvite(data as Invite);
        if (data.relationship) {
          form.setValue(
            "relationship",
            data.relationship as ReferenceFormValues["relationship"]
          );
        }
        if (data.reference_name) {
          form.setValue("managerName", data.reference_name);
        }
        if (data.status === "verified") {
          setDone({ authenticity_score: 100 });
        }
      } catch (err) {
        if (active) {
          setLoadError(
            err instanceof Error ? err.message : "Unable to load invite"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [token, form]);

  const progress = useMemo(() => (step / STEPS.length) * 100, [step]);

  async function validateStep() {
    const values = form.getValues();
    if (step === 1) {
      const parsed = referenceFormSchema
        .pick({
          managerName: true,
          relationship: true,
          linkedInUrl: true,
        })
        .safeParse(values);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          form.setError(issue.path[0] as keyof ReferenceFormValues, {
            type: "manual",
            message: issue.message,
          });
        }
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (values.superpowers.length !== 7) {
        form.setError("superpowers", {
          type: "manual",
          message: "Select exactly 7 superpowers",
        });
        return false;
      }
      return true;
    }
    if (step === 3) {
      return true;
    }
    if (step === 4) {
      const parsed = referenceFormSchema
        .pick({ endorsement: true })
        .safeParse(values);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          form.setError(issue.path[0] as keyof ReferenceFormValues, {
            type: "manual",
            message: issue.message,
          });
        }
        return false;
      }
      return true;
    }
    return true;
  }

  async function onNext() {
    setSubmitError(null);
    const ok = await validateStep();
    if (!ok) return;

    if (step < 4) {
      setStep((step + 1) as StepId);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = { token, ...form.getValues() };
      const res = await fetch("/api/reference/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }
      setDone({ authenticity_score: data.authenticity_score ?? 0 });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Verification failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-[#F7F6F3] px-5">
        <p className="text-sm text-[#5B616B]">Loading invite…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-[#F7F6F3] px-5">
        <div className="max-w-sm text-center">
          <BrandMark className="mx-auto h-14 w-auto" />
          <p className="mt-4 font-display text-lg font-semibold text-[#2B5B84]">
            Invite unavailable
          </p>
          <p className="mt-2 text-sm text-[#5B616B]">{loadError}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-[#F7F6F3] px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <BrandMark className="mx-auto h-14 w-auto" />
            <p className="mt-4 font-display text-2xl font-semibold text-[#2B5B84]">
              Thank you
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#5B616B]">
              Your verification is in. Authenticity score recorded:{" "}
              <span className="font-semibold text-[#E87A5D]">
                {Math.round(done.authenticity_score)}
              </span>
              /100.
            </p>
          </div>
          <ReferrerSeekerCta className="mt-8 text-left" />
        </div>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <div className="min-h-[100svh] bg-[#F7F6F3] text-[#2A2D34]">
        <header className="sticky top-0 z-20 border-b border-[#2B5B84]/10 bg-[#F7F6F3]/95 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-center gap-2">
              <BrandMark className="h-8 w-auto" />
              <p className="font-display text-xs font-bold tracking-[0.16em] text-[#2A2D34] uppercase">
                Reference
              </p>
            </div>
            <p className="font-display text-[11px] font-medium tracking-wide text-[#5B616B] uppercase">
              Step {step}/4
            </p>
          </div>
          <div className="mx-auto max-w-lg px-5 pb-3">
            <Progress
              value={progress}
              className="block h-auto w-full [&>[data-slot=progress-track]]:h-1.5 [&>[data-slot=progress-track]]:bg-[#2B5B84]/15 [&_[data-slot=progress-indicator]]:bg-[#E87A5D]"
            />
            {invite && (
              <p className="mt-2 truncate text-xs text-[#5B616B]">
                For {invite.candidate_title}
              </p>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-lg px-5 pb-28 pt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <StepIdentity candidateTitle={invite?.candidate_title} />
              )}
              {step === 2 && <StepSuperpowers />}
              {step === 3 && <StepRatings />}
              {step === 4 && <StepEndorsement />}
            </motion.div>
          </AnimatePresence>
          {submitError && (
            <p className="mt-4 text-sm text-destructive">{submitError}</p>
          )}
        </main>

        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-[#2B5B84]/10 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              disabled={step === 1 || submitting}
              onClick={() => setStep((step - 1) as StepId)}
              className="h-12 min-w-24 rounded-md border border-[#2B5B84]/20 px-4 font-display text-xs font-semibold tracking-[0.12em] text-[#2B5B84] uppercase disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void onNext()}
              className="h-12 min-w-36 rounded-md bg-[#2B5B84] px-5 font-display text-xs font-semibold tracking-[0.12em] text-white uppercase hover:bg-[#244e71] disabled:opacity-60"
            >
              {submitting
                ? "Submitting…"
                : step === 4
                  ? "Submit verification"
                  : "Continue"}
            </button>
          </div>
        </footer>
      </div>
    </FormProvider>
  );
}
