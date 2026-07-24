import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/api-guards";
import { DEMO_ADMIN_USERS } from "@/lib/admin/demo";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  if (auth.actor.demo) {
    return NextResponse.json({ demo: true, users: DEMO_ADMIN_USERS });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select(
      "id, email, full_name, role, is_admin, is_superuser, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin users]", error.message);
    return NextResponse.json(
      { error: "Unable to load users" },
      { status: 500 }
    );
  }

  return NextResponse.json({ demo: false, users: data ?? [] });
}

const patchSchema = z.object({
  userId: z.string().uuid().or(z.string().min(1)),
  is_admin: z.boolean().optional(),
  is_superuser: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const nextAdmin =
    parsed.data.is_superuser === true
      ? true
      : parsed.data.is_admin;
  const nextSuper = parsed.data.is_superuser;

  if (auth.actor.demo) {
    return NextResponse.json({
      ok: true,
      demo: true,
      userId: parsed.data.userId,
      is_admin: nextAdmin ?? undefined,
      is_superuser: nextSuper ?? undefined,
    });
  }

  const updates: { is_admin?: boolean; is_superuser?: boolean } = {};
  if (typeof nextAdmin === "boolean") updates.is_admin = nextAdmin;
  if (typeof nextSuper === "boolean") {
    updates.is_superuser = nextSuper;
    if (nextSuper) updates.is_admin = true;
  }

  // Prefer service role so privilege trigger allows the write.
  const admin = createAdminClient();
  const client = admin ?? (await createClient());

  const { error } = await client
    .from("user_profiles")
    .update(updates)
    .eq("id", parsed.data.userId);

  if (error) {
    console.error("[admin users patch]", error.message);
    return NextResponse.json(
      { error: "Unable to update privileges" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, ...updates });
}
