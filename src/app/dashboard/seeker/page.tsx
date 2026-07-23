import type { Metadata } from "next";

import { SeekerDashboard } from "@/components/dashboard/seeker-dashboard";

export const metadata: Metadata = {
  title: "Seeker Dashboard · MatchLever",
  description: "Manage your anonymous MatchLever candidate profile.",
};

export default function SeekerDashboardPage() {
  return <SeekerDashboard />;
}
