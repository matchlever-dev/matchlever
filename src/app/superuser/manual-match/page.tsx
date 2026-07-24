import type { Metadata } from "next";

import { SuperuserManualMatchPage } from "@/components/admin/superuser-manual-match-page";

export const metadata: Metadata = {
  title: "Manual Match · MatchLever",
};

export default function Page() {
  return <SuperuserManualMatchPage />;
}
