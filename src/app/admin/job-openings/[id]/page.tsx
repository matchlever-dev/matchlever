import type { Metadata } from "next";

import { AdminJobOpeningDetailPage } from "@/components/admin/job-opening-detail-page";

export const metadata: Metadata = {
  title: "Job Opening · MatchLever Admin",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <AdminJobOpeningDetailPage jobId={id} />;
}
