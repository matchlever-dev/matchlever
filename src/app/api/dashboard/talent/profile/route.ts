import { NextResponse } from "next/server";
import { z } from "zod";

import {
  formatTimezoneDisplay,
  resolveTimezoneId,
} from "@/lib/dashboard/talent";
import {
  TIMEZONE_VALUES,
  timezoneOffsetMinutes,
} from "@/lib/onboarding/schema";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  toPostgresStringArray,
  toPostgresText,
  toPostgresTextOrNull,
} from "@/lib/postgres-text";
import type { Database } from "@/types/database";

type TalentProfileUpdate =
  Database["public"]["Tables"]["talent_profiles"]["Update"];

const editSchema = z.object({
  headline: z.string().trim().min(2).max(120),
  selectedTagline: z.string().trim().min(8).max(200),
  globalCity: z.string().trim().min(1).max(80),
  globalCountry: z.string().trim().min(1).max(80),
  timezone: z.enum(TIMEZONE_VALUES).nullable(),
  verifiedSkills: z.array(z.string().trim().min(1)).max(20),
  suggestedTaglines: z.array(z.string().trim().min(8).max(200)).max(5).optional(),
  sanitizedSummary: z.string().trim().max(4000).nullable().optional(),
  rawResumeText: z.string().trim().max(60_000).nullable().optional(),
  yearsExperience: z.number().int().min(0).max(60).nullable().optional(),
});

export async function PATCH(request: Request) {
  try {
    const parsed = editSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid profile payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      const timezone = parsed.data.timezone;
      return NextResponse.json({
        ok: true,
        demo: true,
        profile: {
          ...parsed.data,
          timezoneOffset: timezoneOffsetMinutes(timezone),
          timezoneLabel: formatTimezoneDisplay(timezone),
        },
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const timezone = resolveTimezoneId(parsed.data.timezone);
    const update: TalentProfileUpdate = {
      headline: toPostgresText(parsed.data.headline),
      selected_tagline: toPostgresText(parsed.data.selectedTagline),
      global_city: toPostgresText(parsed.data.globalCity),
      global_country: toPostgresText(parsed.data.globalCountry),
      timezone: timezone ? toPostgresText(timezone) : null,
      timezone_offset: timezoneOffsetMinutes(timezone),
      verified_skills: toPostgresStringArray(parsed.data.verifiedSkills),
      ...(parsed.data.suggestedTaglines
        ? { suggested_taglines: toPostgresStringArray(parsed.data.suggestedTaglines) }
        : {}),
      ...(parsed.data.sanitizedSummary !== undefined
        ? { sanitized_summary: toPostgresTextOrNull(parsed.data.sanitizedSummary) }
        : {}),
      ...(parsed.data.rawResumeText !== undefined
        ? {
            raw_resume_text:
              toPostgresTextOrNull(parsed.data.rawResumeText)?.slice(0, 60_000) ??
              null,
          }
        : {}),
      ...(parsed.data.yearsExperience !== undefined
        ? { years_experience: parsed.data.yearsExperience }
        : {}),
    };

    let { error } = await supabase
      .from("talent_profiles")
      .update(update)
      .eq("user_id", user.id);

    // Pre-migration DBs may not have the timezone column yet.
    if (error?.message?.includes("timezone")) {
      const { timezone: _timezone, ...withoutTimezone } = update;
      ({ error } = await supabase
        .from("talent_profiles")
        .update(withoutTimezone)
        .eq("user_id", user.id));
    }

    if (error) {
      console.error("[talent edit]", error.message);
      return NextResponse.json(
        { error: "Unable to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update profile";
    console.error("[/api/dashboard/talent/profile PATCH]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        ok: true,
        demo: true,
        message: "Demo delete acknowledged.",
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Remove app profile data (cascades references via FK).
    const { error: profileError } = await supabase
      .from("talent_profiles")
      .delete()
      .eq("user_id", user.id);

    if (profileError) {
      console.error("[talent delete profile]", profileError.message);
      return NextResponse.json(
        { error: "Unable to delete talent profile" },
        { status: 500 }
      );
    }

    const { error: userProfileError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", user.id);

    if (userProfileError) {
      console.error("[talent delete user_profile]", userProfileError.message);
    }

    // Auth user deletion requires service role.
    const admin = createAdminClient();
    if (admin) {
      const { error: authError } = await admin.auth.admin.deleteUser(user.id);
      if (authError) {
        console.error("[talent delete auth]", authError.message);
        return NextResponse.json(
          {
            ok: true,
            warning:
              "Profile removed, but auth user deletion failed. Contact support.",
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete account";
    console.error("[/api/dashboard/talent/profile DELETE]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
