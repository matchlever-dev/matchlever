import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/api-guards";
import { markMatchBilling } from "@/lib/matching/billing";
import { createManualMatch } from "@/lib/matching/create-match";
import { isMatchableTalentStatus } from "@/lib/matching/eligibility";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const bodySchema = z.object({
  talentProfileId: z.string().min(1),
  kanbanColumn: z.string().min(1).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id: jobPostingId } = await context.params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid match payload" }, { status: 400 });
  }

  if (auth.actor.demo) {
    if (!isMatchableTalentStatus("actively_looking")) {
      return NextResponse.json({ error: "Invalid talent" }, { status: 400 });
    }
    const matchIndex = 2;
    const billing = markMatchBilling(matchIndex);
    return NextResponse.json({
      ok: true,
      demo: true,
      match: {
        id: `demo-hs-${Date.now()}`,
        jobPostingId,
        talentProfileId: parsed.data.talentProfileId,
        matchIndex: billing.matchIndex,
        billingStatus: billing.billingStatus,
        invoiceCycle: billing.invoiceCycle,
        matchSource: "manual",
        acceptToken: `demo-token-${Date.now()}`,
        acceptedAt: null,
        kanbanColumn: parsed.data.kanbanColumn || "sourced",
        notes: parsed.data.notes || "Manual match",
        employerEmailSent: true,
        emailDemo: true,
      },
    });
  }

  const supabase = await createClient();
  const result = await createManualMatch({
    supabase,
    jobPostingId,
    talentProfileId: parsed.data.talentProfileId,
    matchedBy: auth.actor.userId,
    kanbanColumn: parsed.data.kanbanColumn,
    notes: parsed.data.notes,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    demo: false,
    match: result.match,
    incognito: result.incognito,
  });
}
