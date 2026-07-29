import type { Metadata } from "next";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = {
  title: "Candidate Onboarding · MatchLever",
  description: "Join MatchLever as an anonymous enterprise software candidate.",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
