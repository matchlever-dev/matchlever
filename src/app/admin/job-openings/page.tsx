import type { Metadata } from "next";

import { AdminJobOpeningsPage } from "@/components/admin/job-openings-page";

export const metadata: Metadata = {
  title: "Admin Job Openings · MatchLever",
};

export default function Page() {
  return <AdminJobOpeningsPage />;
}
