import { NextResponse } from "next/server";

import { onboardingFormSchema } from "@/lib/onboarding/form-schema";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = onboardingFormSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid onboarding payload",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    // Phase 1: validate + acknowledge. Persist to candidate_profiles in a later slice.
    console.info("[onboarding/complete]", {
      title: parsed.data.anonymousTitle,
      city: parsed.data.globalCity,
      tagline: parsed.data.selectedTagline,
      references: parsed.data.references.length,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to complete onboarding" },
      { status: 500 }
    );
  }
}
