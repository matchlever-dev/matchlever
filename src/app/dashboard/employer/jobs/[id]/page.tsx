import { Suspense } from "react";

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
  return (
    <Suspense
      fallback={
        <div className="min-h-[100svh] bg-[#F7F6F3] px-5 py-8 text-sm text-[#5B616B] sm:px-8">
          Loading job opening…
        </div>
      }
    >
      <JobOpeningDetailPage jobId={id} />
    </Suspense>
  );
}
