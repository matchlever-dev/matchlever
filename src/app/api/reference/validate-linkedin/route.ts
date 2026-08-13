import { NextResponse } from "next/server";
import { z } from "zod";

import {
  REFERRER_LINKEDIN_INVALID_MESSAGE,
  validateReferrerLinkedIn,
} from "@/lib/reference/linkedin-validation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  urls: z.array(z.string()).min(1).max(3),
});

export async function POST(request: Request) {
  try {
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const results = await Promise.all(
      parsed.data.urls.map(async (url) => {
        const validation = await validateReferrerLinkedIn(url);
        return {
          url,
          valid: validation.valid,
          normalizedUrl: validation.normalizedUrl,
          error: validation.valid ? null : REFERRER_LINKEDIN_INVALID_MESSAGE,
        };
      })
    );

    return NextResponse.json({
      ok: results.every((row) => row.valid),
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to validate LinkedIn URLs";
    console.error("[/api/reference/validate-linkedin]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
