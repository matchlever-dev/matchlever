"use client";

import Link from "next/link";

import { useNavSession } from "@/components/brand/nav-session-provider";
import { Button } from "@/components/ui/button";

export function RoleSwitcher({
  current,
}: {
  current: "talent" | "employer";
}) {
  const { session, ready } = useNavSession();
  const other = current === "talent" ? "employer" : "talent";
  const otherHref =
    other === "talent" ? "/dashboard/talent" : "/dashboard/employer";
  const otherLabel = other === "talent" ? "Talent" : "Employer";
  const staffLink = ready ? session.staffLink : null;

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
      {staffLink ? (
        <Link
          href={staffLink.href}
          className="text-xs font-medium text-[#2B5B84] underline-offset-2 hover:underline"
        >
          {staffLink.label === "Superuser Console" ? "Superuser" : "Admin"}
        </Link>
      ) : null}
    </div>
  );
}
