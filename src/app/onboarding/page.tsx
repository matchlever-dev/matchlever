import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Talent Onboarding · MatchLever",
  description: "Join MatchLever as an anonymous enterprise software talent.",
};

export const dynamic = "force-dynamic";

/**
 * Returning talent who already have a profile should edit missing fields on
 * the dashboard — not restart full onboarding (which risks overwriting data).
 */
export default async function OnboardingPage() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("talent_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          redirect("/dashboard/talent?edit=1");
        }
      }
    } catch (error) {
      // Next.js redirect() throws; rethrow. Ignore auth/config failures so
      // the wizard still loads for first-time / demo visitors.
      if (
        error &&
        typeof error === "object" &&
        "digest" in error &&
        typeof (error as { digest?: unknown }).digest === "string" &&
        (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
        throw error;
      }
    }
  }

  return <OnboardingWizard />;
}
