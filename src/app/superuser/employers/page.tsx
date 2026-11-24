import type { Metadata } from "next";

import { SuperuserEmployersPage } from "@/components/admin/admin-employers-page";

export const metadata: Metadata = {
  title: "Superuser Employers · MatchLever",
};

export default function Page() {
  return <SuperuserEmployersPage />;
}
