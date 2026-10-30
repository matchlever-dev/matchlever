import type { Metadata } from "next";

import { AdminDashboardPage } from "@/components/admin/admin-dashboard-page";

export const metadata: Metadata = {
  title: "Admin Dashboard · MatchLever",
};

export default function Page() {
  return <AdminDashboardPage />;
}
