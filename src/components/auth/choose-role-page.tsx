"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";

export function ChooseRolePage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F6F3] px-5 py-12">
      <div className="w-full max-w-lg rounded-lg border border-[#2B5B84]/15 bg-white p-8">
        <BrandMark className="h-10 w-auto" />
        <h1 className="mt-6 font-display text-2xl font-semibold text-[#2B5B84]">
          Continue as…
        </h1>
        <p className="mt-2 text-sm text-[#5B616B]">
          Your account has both Talent and Employer profiles. Choose how you
          want to use MatchLever right now.
        </p>
        <div className="mt-8 grid gap-3">
          <Button
            className="h-12 bg-[#2B5B84] text-white hover:bg-[#244e71]"
            onClick={() => router.push("/dashboard/talent")}
          >
            Continue as Talent
          </Button>
          <Button
            variant="outline"
            className="h-12 border-[#E87A5D] text-[#E87A5D] hover:bg-[#E87A5D]/10"
            onClick={() => router.push("/dashboard/employer")}
          >
            Continue as Employer
          </Button>
        </div>
        <p className="mt-6 text-center text-xs text-[#5B616B]">
          You can switch profiles anytime from your dashboard header.{" "}
          <Link href="/" className="text-[#2B5B84] underline underline-offset-2">
            Back home
          </Link>
        </p>
      </div>
    </main>
  );
}
