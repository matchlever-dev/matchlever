import type { Metadata } from "next";

import { SuperuserTalentPage } from "@/components/admin/admin-talent-page";

export const metadata: Metadata = {
  title: "Superuser Talent · MatchLever",
};

export default function Page() {
  return <SuperuserTalentPage />;
}
