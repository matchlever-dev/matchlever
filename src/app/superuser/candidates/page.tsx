import type { Metadata } from "next";

import { SuperuserCandidatesPage } from "@/components/admin/admin-candidates-page";

export const metadata: Metadata = {
  title: "Superuser Candidates · MatchLever",
};

export default function Page() {
  return <SuperuserCandidatesPage />;
}
