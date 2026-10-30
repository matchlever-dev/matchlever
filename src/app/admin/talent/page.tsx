import type { Metadata } from "next";

import { AdminTalentsPage } from "@/components/admin/admin-talent-page";

export const metadata: Metadata = {
  title: "Admin Talent · MatchLever",
};

export default function Page() {
  return <AdminTalentsPage />;
}
