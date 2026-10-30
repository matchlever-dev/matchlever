import type { Metadata } from "next";

import { AdminSiteCopyPage } from "@/components/admin/admin-site-copy-page";

export const metadata: Metadata = {
  title: "Admin Site copy · MatchLever",
};

export default function Page() {
  return <AdminSiteCopyPage />;
}
