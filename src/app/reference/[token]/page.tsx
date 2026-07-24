import type { Metadata } from "next";

import { ReferenceVerificationWizard } from "@/components/reference/verification-wizard";

export const metadata: Metadata = {
  title: "Verify Reference · MatchLever",
  description: "Confirm a MatchLever candidate reference with verified signal.",
};

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function ReferenceVerificationPage({ params }: PageProps) {
  const { token } = await params;
  return <ReferenceVerificationWizard token={token} />;
}
