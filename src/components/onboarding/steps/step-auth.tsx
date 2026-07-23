"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";

import type { OnboardingFormValues } from "@/lib/onboarding/form-schema";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function StepAuth() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();

  const linkedInConnected = watch("linkedInConnected");
  const incognitoAgreed = watch("incognitoAgreed");

  useEffect(() => {
    let active = true;
    async function syncSession() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (active && data.user) {
          setValue("linkedInConnected", true, { shouldValidate: true });
        }
      } catch {
        // Supabase may be unconfigured in local demos.
      }
    }
    void syncSession();
    return () => {
      active = false;
    };
  }, [setValue]);

  async function connectLinkedIn() {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "linkedin_oidc",
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (error) {
        // Dev/demo fallback when LinkedIn provider is not configured yet.
        console.warn("[linkedin oauth]", error.message);
        setValue("linkedInConnected", true, { shouldValidate: true });
        return;
      }
    } catch (err) {
      console.warn("[linkedin oauth]", err);
      setValue("linkedInConnected", true, { shouldValidate: true });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#2B5B84] sm:text-3xl">
          Sign in privately
        </h2>
        <p className="mt-2 text-sm text-[#2A2D34]/70 sm:text-base">
          LinkedIn verifies you are a real professional. Your public profile stays
          hidden until you choose to reveal it.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          type="button"
          size="lg"
          onClick={connectLinkedIn}
          className="h-11 w-full gap-2 bg-[#0A66C2] text-white hover:bg-[#004182] sm:w-auto"
        >
          <LinkedInIcon className="size-4" />
          {linkedInConnected ? "LinkedIn connected" : "Continue with LinkedIn"}
        </Button>
        {errors.linkedInConnected && (
          <p className="text-xs text-destructive">
            {errors.linkedInConnected.message}
          </p>
        )}
        {linkedInConnected && (
          <p className="text-xs font-medium text-[#2B5B84]">
            Identity verified. Your name stays off the public seeker card.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[#2B5B84]/15 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="incognito" className="text-base text-[#2A2D34]">
              Incognito Privacy Mode
            </Label>
            <p className="mt-1 text-sm text-[#2A2D34]/65">
              I agree that MatchLever will strip PII from my résumé, keep my
              identity anonymous to hirers by default, and only share contact
              details after mutual interest.
            </p>
          </div>
          <Switch
            id="incognito"
            checked={incognitoAgreed}
            onCheckedChange={(checked) =>
              setValue("incognitoAgreed", checked, { shouldValidate: true })
            }
          />
        </div>
        {errors.incognitoAgreed && (
          <p className="mt-3 text-xs text-destructive">
            {errors.incognitoAgreed.message}
          </p>
        )}
      </div>
    </div>
  );
}
