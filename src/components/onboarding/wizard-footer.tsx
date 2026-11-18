"use client";

import { Button } from "@/components/ui/button";

export function WizardFooter({
  step,
  isSubmitting,
  isSavingLater,
  error,
  onBack,
  onNext,
  onFinishLater,
  nextLabel,
  showFinishLater,
}: {
  step: number;
  isSubmitting?: boolean;
  isSavingLater?: boolean;
  error?: string | null;
  onBack: () => void;
  onNext: () => void;
  onFinishLater?: () => void;
  nextLabel: string;
  showFinishLater?: boolean;
}) {
  const busy = Boolean(isSubmitting || isSavingLater);

  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-[#2B5B84]/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-4 sm:px-8">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={step === 1 || busy}
            className="min-w-24"
          >
            Back
          </Button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {showFinishLater && onFinishLater ? (
              <Button
                type="button"
                variant="outline"
                onClick={onFinishLater}
                disabled={busy}
                className="min-w-36 border-[#2B5B84]/25 text-[#2B5B84]"
              >
                {isSavingLater ? "Saving…" : "Finish later"}
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={onNext}
              disabled={busy}
              className="min-w-36 bg-[#2B5B84] text-white hover:bg-[#244e71]"
            >
              {nextLabel}
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
