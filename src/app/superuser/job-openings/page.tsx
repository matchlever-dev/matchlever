import type { Metadata } from "next";

import { SuperuserJobOpeningsPage } from "@/components/admin/job-openings-page";
import { SUPERUSER_LINKS } from "@/lib/admin/superuser-nav";

export const metadata: Metadata = {
  title: "Job Openings · MatchLever Superuser",
};

export default function Page() {
  return <SuperuserJobOpeningsPage links={SUPERUSER_LINKS} />;
}
