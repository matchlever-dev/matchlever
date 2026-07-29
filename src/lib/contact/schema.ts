import { z } from "zod";

export const CONTACT_STATUSES = ["New", "Active", "Closed"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const CONTACT_TOPICS = [
  "General inquiry",
  "Report an issue",
  "Account help",
  "Partnership",
  "Other",
] as const;

export const MAX_MESSAGE_LENGTH = 300;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_MIME = new Set([
  "image/png",
  "image/jpeg",
  "application/pdf",
]);

export const ALLOWED_ATTACHMENT_EXTENSIONS = [".png", ".jpg", ".jpeg", ".pdf"] as const;

export const contactFormSchema = z.object({
  email: z.string().email("Enter a valid email"),
  topic: z.string().min(1, "Topic is required").max(120),
  message: z
    .string()
    .min(1, "Message is required")
    .max(MAX_MESSAGE_LENGTH, `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const contactAdminPatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(CONTACT_STATUSES).optional(),
  adminNotes: z.string().max(5000).nullable().optional(),
});

export type ContactRequestRow = {
  id: string;
  email: string;
  topic: string;
  message: string;
  attachment_url: string | null;
  /** Signed URL for viewing/downloading the attachment (admin GET only). */
  attachment_download_url?: string | null;
  admin_notes: string | null;
  status: ContactStatus;
  created_at: string;
  updated_at: string;
};

export function isAllowedAttachment(file: File): string | null {
  const name = file.name.toLowerCase();
  const hasExt = ALLOWED_ATTACHMENT_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!hasExt) {
    return "Attachment must be a .png, .jpg, or .pdf file";
  }
  if (!ALLOWED_ATTACHMENT_MIME.has(file.type) && file.type !== "") {
    return "Attachment must be a .png, .jpg, or .pdf file";
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return "Attachment must be 5MB or smaller";
  }
  return null;
}
