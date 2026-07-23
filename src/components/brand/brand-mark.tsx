import { cn } from "@/lib/utils";

/** MatchLever ML monogram — native SVG so it shares the page canvas (no pasted plate). */
export function BrandMark({
  className,
  title = "MatchLever",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 155"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 overflow-visible", className)}
      role="img"
      aria-label={title}
    >
      {/* M body */}
      <path
        d="M22 138 L22 34 L62 98 L102 34 L102 138"
        stroke="#2B5B84"
        strokeWidth="20"
        strokeLinejoin="miter"
        strokeLinecap="butt"
      />
      {/* L */}
      <path
        d="M130 138 L130 52"
        stroke="#E87A5D"
        strokeWidth="20"
        strokeLinecap="butt"
      />
      <path
        d="M120 138 L178 138"
        stroke="#E87A5D"
        strokeWidth="20"
        strokeLinecap="butt"
      />
      {/* L top loop */}
      <circle
        cx="148"
        cy="42"
        r="18"
        stroke="#E87A5D"
        strokeWidth="14"
        fill="none"
      />
      {/* Base color join */}
      <path d="M92 138 H130" stroke="#2B5B84" strokeWidth="20" />
      <path
        d="M110 128 L130 138 L110 148 Z"
        fill="#E87A5D"
        opacity="0.95"
      />
      {/* Lever arc */}
      <path
        d="M10 122 C 55 112, 95 78, 128 58 C 150 46, 168 34, 190 16"
        stroke="#2B5B84"
        strokeWidth="16"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandWordmark({
  className,
  showTagline = true,
  align = "left",
}: {
  className?: string;
  showTagline?: boolean;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        align === "center" ? "text-center" : "text-left",
        className
      )}
    >
      <p className="font-display text-[clamp(1.5rem,6vw,3rem)] font-extrabold leading-none tracking-[0.1em] text-[#2A2D34] uppercase">
        MatchLever
      </p>
      {showTagline && (
        <p className="mt-2.5 font-display text-[clamp(0.58rem,2.2vw,0.75rem)] font-medium tracking-[0.26em] text-[#6B7280] uppercase sm:tracking-[0.32em]">
          Unlock your potential, together
        </p>
      )}
    </div>
  );
}
