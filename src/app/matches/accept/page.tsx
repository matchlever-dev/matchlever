import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

/** Legacy Accept URL — redirects to the Accept/Pass respond page. */
export default async function MatchAcceptRedirectPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const token = params.token?.trim() || "";
  if (!token) {
    redirect("/matches/respond?decision=accept");
  }
  redirect(
    `/matches/respond?token=${encodeURIComponent(token)}&decision=accept`
  );
}
