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

  throw new Error("Unsupported file type. Upload a PDF or DOCX resume.");
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  // unpdf ships a serverless PDF.js build — no DOMMatrix / canvas native deps.
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  const merged = text.trim();
  if (!merged) {
    throw new Error("Could not extract text from PDF. Try a text-based PDF.");
  }
  return merged;
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value?.trim() ?? "";
  if (!text) {
    throw new Error("Could not extract text from DOCX.");
  }
  return text;
}
