import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

const ACCEPTED_EXTENSIONS = new Set([".pdf", ".docx"]);

export function isSupportedResumeFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const hasSupportedExt = [...ACCEPTED_EXTENSIONS].some((ext) =>
    name.endsWith(ext)
  );
  return hasSupportedExt || ACCEPTED_MIME_TYPES.has(file.type);
}

export async function extractResumeText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdfText(buffer);
  }

  if (
    lowerName.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocxText(buffer);
  }

  throw new Error(
    "Unsupported file type. Upload a PDF or DOCX resume."
  );
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = result.text?.trim() ?? "";
    if (!text) {
      throw new Error("Could not extract text from PDF. Try a text-based PDF.");
    }
    return text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value?.trim() ?? "";
  if (!text) {
    throw new Error("Could not extract text from DOCX.");
  }
  return text;
}
