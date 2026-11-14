import Link from "next/link";
import type { ReactNode } from "react";

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  MARKDOWN_LINK_RE.lastIndex = 0;
  while ((match = MARKDOWN_LINK_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(
      <Link
        key={`faq-link-${key++}`}
        href={match[2]}
        className="font-semibold text-[#2B5B84] underline decoration-[#2B5B84]/30 underline-offset-2 transition hover:text-[#E87A5D] hover:decoration-[#E87A5D]"
      >
        {match[1]}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

function formatParagraph(text: string): ReactNode {
  const colonIndex = text.indexOf(": ");
  if (colonIndex > 0 && colonIndex < 80) {
    const label = text.slice(0, colonIndex);
    const body = text.slice(colonIndex + 2);
    return (
      <>
        <span className="font-semibold text-[#2B5B84]">{label}:</span>{" "}
        {renderInline(body)}
      </>
    );
  }

  return <>{renderInline(text)}</>;
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
