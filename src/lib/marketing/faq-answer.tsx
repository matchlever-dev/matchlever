import type { ReactNode } from "react";

function formatParagraph(text: string): ReactNode {
  const colonIndex = text.indexOf(": ");
  if (colonIndex > 0 && colonIndex < 80) {
    const label = text.slice(0, colonIndex);
    const body = text.slice(colonIndex + 2);
    return (
      <>
        <span className="font-semibold text-[#2B5B84]">{label}:</span> {body}
      </>
    );
  }

  return text;
}

export function FaqAnswer({ answer }: { answer: string }) {
  const paragraphs = answer
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3 text-base leading-relaxed text-[#2A2D34]/80">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{formatParagraph(paragraph)}</p>
      ))}
    </div>
  );
}
