import type { Metadata } from "next";

import { SuperuserJobOpeningDetailPage } from "@/components/admin/job-opening-detail-page";
import { SUPERUSER_LINKS } from "@/lib/admin/superuser-nav";

export const metadata: Metadata = {
  title: "Job Opening · MatchLever Superuser",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return (
    <SuperuserJobOpeningDetailPage jobId={id} links={SUPERUSER_LINKS} />
  );
}
