"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  UserSquare2,
} from "lucide-react";

import { ADMIN_LINKS } from "@/lib/admin/admin-nav";
import { cn } from "@/lib/utils";

const ICONS = {
  "/admin/dashboard": LayoutDashboard,
  "/admin/users": Users,
  "/admin/talent": UserSquare2,
  "/admin/contact": MessageSquare,
} as const;

/** Fixed bottom navigation for mobile admin dashboard. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#2B5B84]/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {ADMIN_LINKS.map((link) => {
          const Icon = ICONS[link.href as keyof typeof ICONS] ?? LayoutDashboard;
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-center transition-colors",
                  active ? "text-[#2B5B84]" : "text-[#5B616B]"
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="font-display text-[10px] font-semibold tracking-wide uppercase">
                  {link.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
