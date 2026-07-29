import { NextResponse } from "next/server";

import { DEMO_CONTACT_REQUESTS } from "@/lib/admin/demo";
import {
  contactAdminPatchSchema,
  type ContactRequestRow,
  type ContactStatus,
} from "@/lib/contact/schema";
import { requireAdminApi } from "@/lib/auth/api-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const CONTACT_BUCKET = "contact-attachments";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

async function withSignedAttachmentUrls(
  rows: ContactRequestRow[]
): Promise<ContactRequestRow[]> {
  const admin = createAdminClient();
  if (!admin) {
    return rows.map((row) => ({
      ...row,
      attachment_download_url: null,
    }));
  }

  return Promise.all(
    rows.map(async (row) => {
      if (!row.attachment_url) {
        return { ...row, attachment_download_url: null };
      }

      const { data, error } = await admin.storage
        .from(CONTACT_BUCKET)
        .createSignedUrl(row.attachment_url, SIGNED_URL_TTL_SECONDS);

      if (error) {
        console.error("[admin contact signed url]", error.message);
        return { ...row, attachment_download_url: null };
      }

      return { ...row, attachment_download_url: data.signedUrl };
    })
  );
}

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  if (auth.actor.demo) {
    return NextResponse.json({
      demo: true,
      requests: DEMO_CONTACT_REQUESTS,
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_requests")
    .select(
      "id, email, topic, message, attachment_url, admin_notes, status, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin contact]", error.message);
    return NextResponse.json(
      { error: "Unable to load contact requests" },
      { status: 500 }
    );
  }

  const requests = await withSignedAttachmentUrls(
    (data ?? []).map((row) => ({
      ...row,
      status: row.status as ContactStatus,
    }))
  );

  return NextResponse.json({ demo: false, requests });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const parsed = contactAdminPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (
    parsed.data.status === undefined &&
    parsed.data.adminNotes === undefined
  ) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    );
  }

  if (auth.actor.demo) {
    return NextResponse.json({
      ok: true,
      demo: true,
      id: parsed.data.id,
      status: parsed.data.status,
      adminNotes: parsed.data.adminNotes,
    });
  }

  const updates: {
    status?: string;
    admin_notes?: string | null;
  } = {};
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.adminNotes !== undefined) {
    updates.admin_notes = parsed.data.adminNotes;
  }

  const admin = createAdminClient();
  const client = admin ?? (await createClient());

  const { error } = await client
    .from("contact_requests")
    .update(updates)
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[admin contact patch]", error.message);
    return NextResponse.json(
      { error: "Unable to update contact request" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, ...updates });
}
