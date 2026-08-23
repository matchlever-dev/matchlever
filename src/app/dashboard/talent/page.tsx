import type { Metadata } from "next";
import { Suspense } from "react";

import { CandidateDashboard } from "@/components/dashboard/candidate-dashboard";

export const metadata: Metadata = {
  title: "Candidate Dashboard · MatchLever",
  description: "Manage your anonymous MatchLever candidate profile.",
};

export default function CandidateDashboardPage() {
  return (
    <Suspense fallback={null}>
      <CandidateDashboard />
    </Suspense>
  );
}
