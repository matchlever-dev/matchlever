"use client";

import { ONBOARDING_STEPS, type OnboardingStepId } from "@/lib/onboarding/form-schema";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function StepProgress({ step }: { step: OnboardingStepId }) {
  const pct = (step / ONBOARDING_STEPS.length) * 100;

  return (
    <header className="sticky top-0 z-30 border-b border-[#2B5B84]/10 bg-[#F8F9FA]/95 backdrop-blur">
      <div className="mx-auto max-w-3xl px-6 py-4 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <p className="font-display text-lg font-semibold text-[#2B5B84]">
            MatchLever
          </p>
          <p className="text-xs font-medium tracking-wide text-[#2A2D34]/60 uppercase">
            Step {step} of {ONBOARDING_STEPS.length}
          </p>
        </div>
        <Progress
          value={pct}
          className="mt-3 block h-auto w-full [&>[data-slot=progress-track]]:h-1.5 [&>[data-slot=progress-track]]:bg-[#2B5B84]/15 [&_[data-slot=progress-indicator]]:bg-[#E87A5D]"
        />
        <nav className="mt-4 grid grid-cols-4 gap-2">
          {ONBOARDING_STEPS.map((item) => (
            <div key={item.id} className="min-w-0">
              <p
                className={cn(
                  "truncate text-xs font-semibold",
                  item.id <= step ? "text-[#2B5B84]" : "text-[#2A2D34]/35"
                )}
              >
                {item.title}
              </p>
              <p className="hidden truncate text-[11px] text-[#2A2D34]/50 sm:block">
                {item.description}
              </p>
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
}
