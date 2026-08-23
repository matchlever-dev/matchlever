import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Talent users can request an employer waitlist profile (status: waitlisted). */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true, status: "waitlisted" });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: userProfile }, { data: existing }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("role, full_name, email")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("employer_profiles")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyExists: true,
      status: existing.status,
    });
  }

  const nextRole =
    userProfile?.role === "employer" ? "employer" : "both";

  const { error: roleError } = await supabase
    .from("user_profiles")
    .update({ role: nextRole })
    .eq("id", user.id);

  if (roleError) {
    console.error("[employer request role]", roleError.message);
    return NextResponse.json(
      { error: "Unable to update account role" },
      { status: 500 }
    );
  }

  const { data: employer, error } = await supabase
    .from("employer_profiles")
    .insert({
      user_id: user.id,
      company_name: "Pending intake",
      status: "waitlisted",
      first_match_free_claimed: true,
    })
    .select("id, status")
    .maybeSingle();

  if (error) {
    console.error("[employer request profile]", error.message);
    return NextResponse.json(
      { error: "Unable to create employer profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    employerId: employer?.id,
    status: employer?.status ?? "waitlisted",
  });
}
