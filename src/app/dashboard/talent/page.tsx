import type { Metadata } from "next";
import { Suspense } from "react";

import { TalentDashboard } from "@/components/dashboard/talent-dashboard";

export const metadata: Metadata = {
  title: "Talent Dashboard · MatchLever",
  description: "Manage your anonymous MatchLever talent profile.",
};

export default function TalentDashboardPage() {
  return (
    <Suspense fallback={null}>
      <TalentDashboard />
    </Suspense>
  );
}
