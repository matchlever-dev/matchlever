import { NextResponse } from "next/server";

import { scoreLinkedInAuthenticity } from "@/lib/reference/authenticity";
import {
  linkedInUrlsMatch,
  REFERRER_LINKEDIN_INVALID_MESSAGE,
} from "@/lib/reference/linkedin-validation";
import { referenceVerifySchema } from "@/lib/reference/schema";
import { SUPERPOWER_TAXONOMY } from "@/lib/reference/taxonomy";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

type AggregatedSuperpower = {
  id: string;
  label: string;
  category: string;
  votes: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = referenceVerifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid verification payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const selected = SUPERPOWER_TAXONOMY.filter((item) =>
      input.superpowers.includes(item.id)
    );

    if (selected.length !== 7) {
      return NextResponse.json(
        { error: "Select exactly 7 superpowers from the taxonomy." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      const authenticity = await scoreLinkedInAuthenticity(input.linkedInUrl, {
        managerName: input.managerName,
        relationship: input.relationship,
      });
      return NextResponse.json({
        ok: true,
        demo: true,
        authenticity_score: authenticity.authenticity_score,
        authenticity_flags: authenticity.authenticity_flags,
        superpowers: selected,
        message:
          "Scored without persistence (configure Supabase service role to save).",
      });
    }

    const { data: reference, error: refError } = await admin
      .from("candidate_references")
      .select("id, candidate_profile_id, status, reference_linkedin_url")
      .eq("verification_token", input.token)
      .maybeSingle();

    if (refError) {
      console.error("[reference verify] load", refError.message);
      return NextResponse.json(
        { error: "Unable to load reference invite" },
        { status: 500 }
      );
    }

    if (!reference) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (reference.status === "verified") {
      return NextResponse.json(
        { error: "This reference has already been verified." },
        { status: 409 }
      );
    }

    if (
      reference.reference_linkedin_url &&
      !linkedInUrlsMatch(reference.reference_linkedin_url, input.linkedInUrl)
    ) {
      console.info("[reference verify] linkedin mismatch", {
        expected: reference.reference_linkedin_url,
        received: input.linkedInUrl,
      });
      return NextResponse.json(
        { error: REFERRER_LINKEDIN_INVALID_MESSAGE },
        { status: 400 }
      );
    }

    const authenticity = await scoreLinkedInAuthenticity(input.linkedInUrl, {
      managerName: input.managerName,
      relationship: input.relationship,
    });

    const superpowersPayload = selected.map((item) => ({
      id: item.id,
      label: item.label,
      category: item.category,
    }));

    const { error: updateError } = await admin
      .from("candidate_references")
      .update({
        reference_name: input.managerName,
        relationship: input.relationship,
        reference_linkedin_url: input.linkedInUrl,
        authenticity_score: authenticity.authenticity_score,
        authenticity_flags: authenticity.authenticity_flags as Json,
        superpowers: superpowersPayload as Json,
        reliability_score: input.reliability,
        technical_quality_score: input.technicalQuality,
        rehire_intent_score: input.rehireIntent,
        endorsement: input.endorsement,
        status: "verified",
        verified_at: new Date().toISOString(),
      })
      .eq("id", reference.id);

    if (updateError) {
      console.error("[reference verify] update", updateError.message);
      return NextResponse.json(
        { error: "Unable to save reference verification" },
        { status: 500 }
      );
    }

    const { data: verifiedRows, error: listError } = await admin
      .from("candidate_references")
      .select("superpowers")
      .eq("candidate_profile_id", reference.candidate_profile_id)
      .eq("status", "verified");

    if (listError) {
      console.error("[reference verify] aggregate", listError.message);
      return NextResponse.json(
        { error: "Saved reference but failed to aggregate superpowers" },
        { status: 500 }
      );
    }

    const tallies = new Map<string, AggregatedSuperpower>();
    for (const row of verifiedRows ?? []) {
      const items = Array.isArray(row.superpowers) ? row.superpowers : [];
      for (const raw of items) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        const id = String(item.id ?? "");
        if (!id) continue;
        const existing = tallies.get(id);
        if (existing) {
          existing.votes += 1;
        } else {
          tallies.set(id, {
            id,
            label: String(item.label ?? id),
            category: String(item.category ?? "Unknown"),
            votes: 1,
          });
        }
      }
    }

    const aggregated = [...tallies.values()].sort(
      (a, b) => b.votes - a.votes || a.label.localeCompare(b.label)
    );

    const { error: profileError } = await admin
      .from("candidate_profiles")
      .update({ verified_superpowers: aggregated as Json })
      .eq("id", reference.candidate_profile_id);

    if (profileError) {
      console.error("[reference verify] profile", profileError.message);
      return NextResponse.json(
        { error: "Saved reference but failed to update candidate profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      authenticity_score: authenticity.authenticity_score,
      authenticity_flags: authenticity.authenticity_flags,
      verified_superpowers: aggregated,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Verification failed";
    console.error("[/api/reference/verify]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
