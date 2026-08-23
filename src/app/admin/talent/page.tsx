import type { Metadata } from "next";

import { AdminCandidatesPage } from "@/components/admin/admin-candidates-page";

export const metadata: Metadata = {
  title: "Admin Candidates · MatchLever",
};

export default function Page() {
  return <AdminCandidatesPage />;
}
