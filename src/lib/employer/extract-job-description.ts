import { toPostgresText } from "@/lib/postgres-text";
import {
  extractResumeText,
  isSupportedResumeFile,
} from "@/lib/resume/extract-text";

const HTML_MIME = new Set(["text/html", "application/xhtml+xml"]);
const HTML_EXTENSIONS = [".html", ".htm"];

export function isSupportedJobDescriptionFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (HTML_EXTENSIONS.some((ext) => name.endsWith(ext))) return true;
  if (HTML_MIME.has(file.type)) return true;
  return isSupportedResumeFile(file);
}

export async function extractJobDescriptionText(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();

  if (
    HTML_EXTENSIONS.some((ext) => lowerName.endsWith(ext)) ||
    HTML_MIME.has(file.type)
  ) {
    return extractHtmlText(Buffer.from(await file.arrayBuffer()));
  }

  // Reuse the resume PDF/DOCX extractors.
  return extractResumeText(file);
}

function extractHtmlText(buffer: Buffer): string {
  const raw = buffer.toString("utf8");
  const withoutNoise = raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  const text = toPostgresText(withoutNoise)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) {
    throw new Error("Could not extract text from HTML.");
  }
  return text;
}
