import { cn } from "@/lib/utils";
import { tryParseHttpUrl } from "@/lib/url";

export function ReferrerLinkedInLink({
  url,
  className,
}: {
  url: string | null | undefined;
  className?: string;
}) {
  const raw = url?.trim() || "";
  if (!raw) {
    return <span className={className}>No LinkedIn URL</span>;
  }
  const parsed = tryParseHttpUrl(raw);
  if (!parsed) {
    return <span className={className}>{raw}</span>;
  }

  return (
    <a
      href={parsed.toString()}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "text-[#2B5B84] underline-offset-2 hover:underline",
        className
      )}
    >
      {raw}
    </a>
  );
}
