import Image from "next/image";

import { cn } from "@/lib/utils";

/** Official MatchLever monogram (extracted from brand artwork). */
export function BrandMark({
  className,
  title = "MatchLever",
  priority = false,
}: {
  className?: string;
  title?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/matchlever-mark.png"
      alt={title}
      width={303}
      height={199}
      priority={priority}
      className={cn("h-auto w-auto shrink-0 object-contain", className)}
    />
  );
}

export function BrandWordmark({
  className,
  showTagline = false,
  align = "left",
  tagline,
}: {
  className?: string;
  showTagline?: boolean;
  align?: "left" | "center";
  tagline?: string;
}) {
  return (
    <div
      className={cn(
        align === "center" ? "text-center" : "text-left",
        className
      )}
    >
      <p className="font-display text-[clamp(1.75rem,6.5vw,3.25rem)] font-extrabold leading-none tracking-tight text-[#2A2D34]">
        MatchLever
      </p>
      {showTagline && (
        <p className="mt-2.5 font-display text-[clamp(0.7rem,2.2vw,0.85rem)] font-medium tracking-wide text-[#6B7280]">
          {tagline ?? "No names. No bias. Just the right match."}
        </p>
      )}
    </div>
  );
}
