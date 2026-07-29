import type { Metadata } from "next";

import { AdminContactPage } from "@/components/admin/admin-contact-page";

export const metadata: Metadata = {
  title: "Admin Contact · MatchLever",
};

export default function Page() {
  return <AdminContactPage />;
}
