import type { Metadata } from "next";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = {
  title: "Seeker Onboarding · MatchLever",
  description: "Join MatchLever as an anonymous enterprise software seeker.",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
