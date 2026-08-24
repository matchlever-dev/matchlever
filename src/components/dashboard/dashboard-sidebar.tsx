"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  MessageSquare,
  Users,
  UserSquare2,
} from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { ADMIN_LINKS } from "@/lib/admin/admin-nav";
import { cn } from "@/lib/utils";

const ICONS = {
  "/admin/dashboard": LayoutDashboard,
  "/admin/users": Users,
  "/admin/talent": UserSquare2,
  "/admin/employers": Building2,
  "/admin/contact": MessageSquare,
} as const;

export function DashboardSidebar({
  collapsed,
  onCollapsedChange,
}: {
  collapsed: boolean;
  onCollapsedChange: (next: boolean) => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-[100svh] shrink-0 flex-col border-r border-[#2B5B84]/10 bg-white transition-[width] duration-200 lg:flex",
        collapsed ? "w-[72px]" : "w-[232px]"
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-[#2B5B84]/10 px-3",
          collapsed ? "justify-center" : "justify-between gap-2"
        )}
      >
        <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-2">
          <BrandMark className="h-7 w-auto shrink-0" />
          {!collapsed ? (
            <span className="truncate font-display text-[11px] font-bold tracking-[0.16em] text-[#2B5B84] uppercase">
              Admin
            </span>
          ) : null}
        </Link>
        {!collapsed ? (
          <button
            type="button"
            onClick={() => onCollapsedChange(true)}
            className="inline-flex size-11 items-center justify-center rounded-md text-[#2B5B84] hover:bg-[#2B5B84]/8"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="size-4" />
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <div className="flex justify-center border-b border-[#2B5B84]/10 py-2">
          <button
            type="button"
            onClick={() => onCollapsedChange(false)}
            className="inline-flex size-11 items-center justify-center rounded-md text-[#2B5B84] hover:bg-[#2B5B84]/8"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : null}

      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Admin">
        {ADMIN_LINKS.map((link) => {
          const Icon = ICONS[link.href as keyof typeof ICONS] ?? LayoutDashboard;
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              title={link.label}
              className={cn(
                "inline-flex min-h-11 items-center gap-3 rounded-lg px-3 font-display text-xs font-semibold tracking-wide uppercase transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-[#2B5B84] text-white"
                  : "text-[#2B5B84] hover:bg-[#2B5B84]/8"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {!collapsed ? <span>{link.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#2B5B84]/10 p-2">
        <Link
          href="/"
          className={cn(
            "inline-flex min-h-11 w-full items-center rounded-lg px-3 font-display text-xs font-semibold tracking-wide text-[#5B616B] uppercase hover:bg-[#2B5B84]/8",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? "⌂" : "Home"}
        </Link>
      </div>
    </aside>
  );
}
