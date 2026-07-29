import { NextResponse } from "next/server";

import {
  ALLOWED_ATTACHMENT_MIME,
  contactFormSchema,
  isAllowedAttachment,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/contact/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const CONTACT_BUCKET = "contact-attachments";

function extensionForFile(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".png")) return "png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpg";
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  return "jpg";
}

/**
 * Upload an optional attachment to Supabase Storage (S3-compatible).
 * Swap this helper for AWS S3 (`PutObjectCommand`) or local disk
 * (`fs.writeFile` under `public/uploads`) if you change providers —
 * keep returning a durable object path/URL to store on the row.
 */
async function uploadAttachment(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  requestId: string,
  file: File
): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error("Attachment must be 5MB or smaller");
  }

  const path = `${requestId}/${Date.now()}.${extensionForFile(file)}`;
  const contentType = ALLOWED_ATTACHMENT_MIME.has(file.type)
    ? file.type
    : "application/octet-stream";

  const { error } = await admin.storage.from(CONTACT_BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });

  if (error) {
    console.error("[contact upload]", error.message);
    throw new Error("Unable to store attachment");
  }

  return path;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = String(formData.get("email") ?? "");
    const topic = String(formData.get("topic") ?? "");
    const message = String(formData.get("message") ?? "");
    const attachment = formData.get("attachment");

    const parsed = contactFormSchema.safeParse({ email, topic, message });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid contact payload" },
        { status: 400 }
      );
    }

    let file: File | null = null;
    if (attachment instanceof File && attachment.size > 0) {
      const fileError = isAllowedAttachment(attachment);
      if (fileError) {
        return NextResponse.json({ error: fileError }, { status: 400 });
      }
      file = attachment;
    }

    // Demo / local without Supabase: acknowledge without persisting.
    if (!isSupabaseConfigured()) {
      console.info("[contact] demo", parsed.data.email, parsed.data.topic);
      return NextResponse.json({ ok: true, demo: true });
    }

    const admin = createAdminClient();
    if (!admin) {
      console.error("[contact] missing service role key");
      return NextResponse.json(
        { error: "Contact form is temporarily unavailable" },
        { status: 503 }
      );
    }

    const id = crypto.randomUUID();
    let attachmentPath: string | null = null;

    if (file) {
      try {
        attachmentPath = await uploadAttachment(admin, id, file);
      } catch (err) {
        return NextResponse.json(
          {
            error:
              err instanceof Error ? err.message : "Unable to store attachment",
          },
          { status: 400 }
        );
      }
    }

    const { error } = await admin.from("contact_requests").insert({
      id,
      email: parsed.data.email,
      topic: parsed.data.topic,
      message: parsed.data.message,
      attachment_url: attachmentPath,
      status: "New",
    });

    if (error) {
      console.error("[contact insert]", error.message);
      // Best-effort cleanup if the row insert failed after upload.
      if (attachmentPath) {
        await admin.storage.from(CONTACT_BUCKET).remove([attachmentPath]);
      }
      return NextResponse.json(
        { error: "Unable to submit contact request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[contact]", err);
    return NextResponse.json(
      { error: "Unable to submit contact request" },
      { status: 500 }
    );
  }
}
