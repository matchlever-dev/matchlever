import type { Metadata } from "next";

import { AdminFaqPage } from "@/components/admin/admin-faq-page";

export const metadata: Metadata = {
  title: "Admin FAQ - MatchLever",
};

export default function Page() {
  return <AdminFaqPage />;
}
