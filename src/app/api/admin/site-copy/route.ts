import { NextResponse } from "next/server";

import { requireAdminFlagApi } from "@/lib/auth/api-guards";
import {
  DEFAULT_SITE_COPY,
  siteCopyUpdateSchema,
} from "@/lib/marketing/site-copy";
import { getSiteCopy } from "@/lib/marketing/site-copy.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAdminFlagApi();
  if (!auth.ok) return auth.response;

  if (auth.actor.demo) {
    return NextResponse.json({
      demo: true,
      ...DEFAULT_SITE_COPY,
    });
  }

  const copy = await getSiteCopy();
  return NextResponse.json({ demo: false, ...copy });
}

export async function PUT(request: Request) {
  const auth = await requireAdminFlagApi();
  if (!auth.ok) return auth.response;

  const parsed = siteCopyUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { heroTaglines, brandTagline } = parsed.data;

  if (auth.actor.demo) {
    return NextResponse.json({
      ok: true,
      demo: true,
      heroTaglines,
      brandTagline,
    });
  }

  const admin = createAdminClient();
  const client = admin ?? (await createClient());

  const { error } = await client.from("site_copy").upsert(
    {
      id: 1,
      hero_taglines: [...heroTaglines],
      brand_tagline: brandTagline,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("[admin site-copy]", error.message);
    return NextResponse.json(
      { error: "Unable to save site copy" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    heroTaglines,
    brandTagline,
  });
}
