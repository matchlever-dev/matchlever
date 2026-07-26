import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";

export function PortalShell({
  title,
  links,
  children,
  accent = "admin",
}: {
  title: string;
  links: { href: string; label: string }[];
  children: React.ReactNode;
  accent?: "admin" | "superuser";
}) {
  const accentColor = accent === "superuser" ? "#E87A5D" : "#2B5B84";

  return (
    <div className="min-h-[100svh] bg-[#F7F6F3] text-[#2A2D34]">
      <header className="border-b border-[#2B5B84]/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <BrandMark className="h-7 w-auto" />
            </Link>
            <span
              className="font-display text-xs font-bold tracking-[0.18em] uppercase"
              style={{ color: accentColor }}
            >
              {title}
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 font-display text-xs font-semibold tracking-wide text-[#2B5B84] uppercase transition-colors hover:bg-[#2B5B84]/8"
              )}
            >
              {link.label}
            </Link>
            ))}
            <Link
              href="/"
              className="px-3 py-1.5 font-display text-xs font-semibold tracking-wide text-[#5B616B] uppercase transition-colors hover:bg-[#2B5B84]/8"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
