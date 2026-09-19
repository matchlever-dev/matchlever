import { JobOpeningDetailPage } from "@/components/employer/job-opening-pages";

export const metadata = {
  title: "Job Opening | MatchLever",
  description: "View and edit a MatchLever employer job opening.",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <JobOpeningDetailPage jobId={id} />;
}
