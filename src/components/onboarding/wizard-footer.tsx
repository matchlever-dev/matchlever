"use client";

import { Button } from "@/components/ui/button";

export function WizardFooter({
  step,
  isSubmitting,
  onBack,
  onNext,
  nextLabel,
}: {
  step: number;
  isSubmitting?: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-[#2B5B84]/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-4 sm:px-8">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={step === 1 || isSubmitting}
          className="min-w-24"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          className="min-w-36 bg-[#2B5B84] text-white hover:bg-[#244e71]"
        >
          {isSubmitting ? "Saving…" : nextLabel}
        </Button>
      </div>
    </footer>
  );
}
