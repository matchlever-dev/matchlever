import { cn } from "@/lib/utils";

function isSafeHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function ReferrerLinkedInLink({
  url,
  className,
}: {
  url: string | null | undefined;
  className?: string;
}) {
  const href = url?.trim() || "";
  if (!href) {
    return <span className={className}>No LinkedIn URL</span>;
  }
  if (!isSafeHttpUrl(href)) {
    return <span className={className}>{href}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "text-[#2B5B84] underline-offset-2 hover:underline",
        className
      )}
    >
      {href}
    </a>
  );
}
