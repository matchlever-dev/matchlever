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
  const staffLinks = ready ? session.staffLinks : [];

  const canSwitchToEmployer =
    current === "talent" && ready && session.hasEmployerProfile;
  const canSwitchToTalent =
    current === "employer" && ready && session.hasTalentProfile;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canSwitchToEmployer ? (
        <Link href="/dashboard/employer">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-[#E87A5D]/40 text-[#E87A5D]"
          >
            Switch to Employer
          </Button>
        </Link>
      ) : null}
      {canSwitchToTalent ? (
        <Link href="/dashboard/talent">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-[#2B5B84]/20 text-[#2B5B84]"
          >
            Switch to Talent
          </Button>
        </Link>
      ) : null}
      {staffLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex h-8 items-center rounded-md border border-[#E87A5D]/35 bg-[#E87A5D]/10 px-3 text-xs font-semibold text-[#E87A5D] transition hover:bg-[#E87A5D]/20"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
