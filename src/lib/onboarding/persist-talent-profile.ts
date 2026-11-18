import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  linkedinUrlFromAuthUser,
  normalizePublicLinkedInProfileUrl,
} from "@/lib/auth/linkedin-url";
import { displayNameFromAuthUser } from "@/lib/auth/display-name";
import {
  resolveOnboardingCity,
  type OnboardingFormValues,
} from "@/lib/onboarding/form-schema";
import { timezoneOffsetMinutes } from "@/lib/onboarding/schema";
import {
  toPostgresStringArray,
  toPostgresTextOrNull,
} from "@/lib/postgres-text";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";

type AppSupabase = SupabaseClient<Database>;

export type TalentDraftInput = Partial<OnboardingFormValues> & {
  /** When true, require identity gates the same way complete does. */
  requireIdentity?: boolean;
};

function normalizeTime(value: string): string {
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value;
}

function jsonArray(values: string[] | undefined): Json {
  return toPostgresStringArray(values ?? []);
}

function withoutTimezoneField<T extends { timezone?: string | null }>(
  payload: T
): Omit<T, "timezone"> {
  const { timezone: _ignored, ...rest } = payload;
  void _ignored;
  return rest;
}

export async function ensureUserProfileForTalent(args: {
  supabase: AppSupabase;
  user: User;
  talentLinkedInUrl?: string | null;
}): Promise<{ error: string | null }> {
  const { supabase, user } = args;
  const fullName = displayNameFromAuthUser(user);
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;
  const linkedInUrl =
    normalizePublicLinkedInProfileUrl(args.talentLinkedInUrl || "") ||
    linkedinUrlFromAuthUser(user);

  const { data: existingUserProfile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingUserProfile) {
    const { error } = await supabase
      .from("user_profiles")
      .update({
        email: user.email ?? null,
        full_name: fullName,
        avatar_url: avatarUrl,
        role: "talent",
        ...(linkedInUrl ? { linkedin_url: linkedInUrl } : {}),
      })
      .eq("id", user.id);
    if (error) {
      console.error("[onboarding user_profiles]", error.message);
      return { error: "Unable to save user profile" };
    }
    return { error: null };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "User profile missing and service role is not configured. Re-sign in or set SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const { error } = await admin.from("user_profiles").insert({
    id: user.id,
    email: user.email ?? null,
    full_name: fullName,
    avatar_url: avatarUrl,
    role: "talent",
    linkedin_url: linkedInUrl,
  });
  if (error) {
    console.error("[onboarding user_profiles insert]", error.message);
    return { error: "Unable to create user profile" };
  }
  return { error: null };
}

/** Build a talent_profiles upsert payload from whatever onboarding fields are present. */
export function buildTalentProfilePayload(
  userId: string,
  data: TalentDraftInput
): Database["public"]["Tables"]["talent_profiles"]["Insert"] {
  const locationModes = (
    data.locationModes?.length
      ? (["remote", "hybrid", "onsite"] as const).filter((mode) =>
          data.locationModes!.includes(mode)
        )
      : (["remote"] as const)
  ) as ("remote" | "hybrid" | "onsite")[];

  const needsLocal =
    locationModes.includes("hybrid") || locationModes.includes("onsite");

  const resolvedCity =
    data.globalCity || data.globalCountry || data.customCity
      ? resolveOnboardingCity({
          ...data,
          globalCity: data.globalCity || "",
          globalCountry: data.globalCountry || "",
          customCity: data.customCity,
        } as OnboardingFormValues)
      : "";

  const headline =
    toPostgresTextOrNull(data.anonymousTitle) ||
    (data.resumeFileName ? "MatchLever Talent" : null);

  return {
    user_id: userId,
    headline,
    sanitized_summary: toPostgresTextOrNull(data.sanitizedSummary),
    raw_resume_text:
      toPostgresTextOrNull(data.rawResumeText)?.slice(0, 60_000) ?? null,
    verified_skills: jsonArray(data.verifiedSkills),
    suggested_taglines: jsonArray(data.suggestedTaglines),
    selected_tagline: toPostgresTextOrNull(data.selectedTagline),
    global_city: toPostgresTextOrNull(resolvedCity),
    global_country: toPostgresTextOrNull(data.globalCountry),
    timezone: toPostgresTextOrNull(data.timezone),
    timezone_offset: data.timezone
      ? timezoneOffsetMinutes(data.timezone)
      : null,
    work_hours_start: data.workHoursStart
      ? normalizeTime(data.workHoursStart)
      : null,
    work_hours_end: data.workHoursEnd
      ? normalizeTime(data.workHoursEnd)
      : null,
    location_modes: locationModes,
    location_mode: locationModes[0],
    max_commute_miles: needsLocal ? (data.maxCommuteMiles ?? null) : null,
    open_to_relocation: needsLocal ? (data.openToRelocation ?? null) : null,
    min_salary: data.minSalary ?? null,
    visa_status: toPostgresTextOrNull(data.visaStatus),
    years_experience: data.yearsExperience ?? null,
    talent_tos_accepted_at: data.talentTosAgreed
      ? new Date().toISOString()
      : null,
    // Hidden until references are verified.
    status: "on_hold",
  };
}

export async function upsertTalentProfileDraft(args: {
  supabase: AppSupabase;
  userId: string;
  data: TalentDraftInput;
}): Promise<{ talentId: string | null; error: string | null }> {
  const payload = buildTalentProfilePayload(args.userId, args.data);

  const { data: existingTalent } = await args.supabase
    .from("talent_profiles")
    .select("id")
    .eq("user_id", args.userId)
    .maybeSingle();

  const talentId = existingTalent?.id ?? null;

  if (talentId) {
    let { error: updateError } = await args.supabase
      .from("talent_profiles")
      .update(payload)
      .eq("id", talentId);
    if (updateError?.message?.includes("timezone")) {
      ({ error: updateError } = await args.supabase
        .from("talent_profiles")
        .update(withoutTimezoneField(payload))
        .eq("id", talentId));
    }
    if (updateError) {
      console.error(
        "[onboarding talent update]",
        updateError.message,
        updateError.code,
        updateError.details
      );
      return { talentId: null, error: "Unable to update talent profile" };
    }
    return { talentId, error: null };
  }

  let { data: inserted, error: insertError } = await args.supabase
    .from("talent_profiles")
    .insert(payload)
    .select("id")
    .single();
  if (insertError?.message?.includes("timezone")) {
    ({ data: inserted, error: insertError } = await args.supabase
      .from("talent_profiles")
      .insert(withoutTimezoneField(payload))
      .select("id")
      .single());
  }
  if (insertError || !inserted) {
    console.error(
      "[onboarding talent insert]",
      insertError?.message,
      insertError?.code,
      insertError?.details
    );
    return { talentId: null, error: "Unable to create talent profile" };
  }
  return { talentId: inserted.id, error: null };
}

export type LoadedOnboardingDraft = {
  talentId: string;
  referenceCount: number;
  values: Partial<OnboardingFormValues>;
  stepHint: 1 | 2 | 3 | 4;
};

function timeToHhMm(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 5);
}

export async function loadOnboardingDraft(
  supabase: AppSupabase,
  userId: string
): Promise<LoadedOnboardingDraft | null> {
  const { data: profile } = await supabase
    .from("talent_profiles")
    .select(
      "id, headline, sanitized_summary, raw_resume_text, verified_skills, suggested_taglines, selected_tagline, global_city, global_country, timezone, work_hours_start, work_hours_end, location_modes, max_commute_miles, open_to_relocation, min_salary, visa_status, years_experience, talent_tos_accepted_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile) return null;

  const { count } = await supabase
    .from("talent_references")
    .select("id", { count: "exact", head: true })
    .eq("talent_profile_id", profile.id);

  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("linkedin_url")
    .eq("id", userId)
    .maybeSingle();

  const skills = Array.isArray(profile.verified_skills)
    ? profile.verified_skills.map(String)
    : [];
  const taglines = Array.isArray(profile.suggested_taglines)
    ? profile.suggested_taglines.map(String)
    : [];
  const modes = Array.isArray(profile.location_modes)
    ? profile.location_modes.filter(
        (m): m is "remote" | "hybrid" | "onsite" =>
          m === "remote" || m === "hybrid" || m === "onsite"
      )
    : (["remote"] as const);

  const hasResume = Boolean(
    profile.raw_resume_text?.trim() || profile.sanitized_summary?.trim()
  );
  const hasPrefs = Boolean(
    profile.global_city?.trim() &&
      profile.global_country?.trim() &&
      profile.work_hours_start &&
      profile.work_hours_end &&
      profile.selected_tagline?.trim()
  );

  let stepHint: 1 | 2 | 3 | 4 = 1;
  if (hasResume && hasPrefs) stepHint = 4;
  else if (hasResume) stepHint = 3;
  else if (profile.talent_tos_accepted_at) stepHint = 2;

  return {
    talentId: profile.id,
    referenceCount: count ?? 0,
    stepHint,
    values: {
      talentTosAgreed: Boolean(profile.talent_tos_accepted_at),
      linkedInConnected: true,
      talentLinkedInUrl: userProfile?.linkedin_url || "",
      incognitoAgreed: Boolean(profile.talent_tos_accepted_at),
      resumeFileName: hasResume ? "saved-resume.pdf" : "",
      anonymousTitle: profile.headline || "",
      sanitizedSummary: profile.sanitized_summary || "",
      rawResumeText: profile.raw_resume_text || "",
      verifiedSkills: skills,
      yearsExperience: profile.years_experience ?? undefined,
      suggestedTaglines: taglines,
      locationModes: modes.length ? [...modes] : ["remote"],
      maxCommuteMiles: profile.max_commute_miles,
      openToRelocation: profile.open_to_relocation,
      globalCity: profile.global_city || "",
      globalCountry: profile.global_country || "",
      customCity: "",
      timezone: profile.timezone || "America/New_York",
      workHoursStart: timeToHhMm(profile.work_hours_start) || "09:00",
      workHoursEnd: timeToHhMm(profile.work_hours_end) || "17:00",
      minSalary: profile.min_salary ?? 140000,
      visaStatus: profile.visa_status || "none",
      selectedTagline: profile.selected_tagline || "",
    },
  };
}
