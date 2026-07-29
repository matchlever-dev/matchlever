import Link from "next/link";

import { cn } from "@/lib/utils";

export const SITE_NAV_LINKS = [
  { href: "/why-matchlever", label: "Why MatchLever" },
  { href: "/legal/candidates", label: "Candidate Terms" },
  { href: "/contact", label: "Contact Us" },
  { href: "/login", label: "Login" },
] as const;

export function SiteNavLinks({
  className,
  linkClassName,
}: {
  className?: string;
  linkClassName?: string;
}) {
  return (
    <nav
      aria-label="Site"
      className={cn(
        "flex flex-wrap items-center gap-x-6 gap-y-2 text-sm",
        className
      )}
    >
      {SITE_NAV_LINKS.map((link, index) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            index === 0
              ? "font-semibold text-[#2B5B84] underline-offset-2 transition hover:text-[#E87A5D] hover:underline"
              : "text-[#5B616B] transition hover:text-[#2B5B84]",
            linkClassName
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
