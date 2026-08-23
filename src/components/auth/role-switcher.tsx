"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export function RoleSwitcher({
  current,
  showAdminLinks = false,
}: {
  current: "talent" | "employer";
  showAdminLinks?: boolean;
}) {
  const other = current === "talent" ? "employer" : "talent";
  const otherHref =
    other === "talent" ? "/dashboard/talent" : "/dashboard/employer";
  const otherLabel = other === "talent" ? "Talent" : "Employer";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={otherHref}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-[#2B5B84]/20 text-[#2B5B84]"
        >
          Switch to {otherLabel}
        </Button>
      </Link>
      {showAdminLinks && (
        <>
          <Link
            href="/admin/dashboard"
            className="text-xs font-medium text-[#2B5B84] underline-offset-2 hover:underline"
          >
            Admin
          </Link>
          <Link
            href="/superuser/talent"
            className="text-xs font-medium text-[#2B5B84] underline-offset-2 hover:underline"
          >
            Superuser
          </Link>
        </>
      )}
    </div>
  );
}
