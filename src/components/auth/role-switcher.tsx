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
  const staffLinks = ready ? session.staffLinks : [];

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
      {staffLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex h-8 items-center rounded-md border border-[#E87A5D]/35 bg-[#E87A5D]/10 px-3 text-xs font-semibold text-[#E87A5D] transition hover:bg-[#E87A5D]/20"
        >
          {link.label === "Superuser Console" ? "Superuser" : "Admin Portal"}
        </Link>
      ))}
    </div>
  );
}
