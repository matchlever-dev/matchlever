import type { Metadata } from "next";

import { SuperuserDirectoryPage } from "@/components/admin/superuser-directory-page";

export const metadata: Metadata = {
  title: "Superuser Directory · MatchLever",
};

export default function Page() {
  return <SuperuserDirectoryPage />;
}
