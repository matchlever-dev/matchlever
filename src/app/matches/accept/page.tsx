"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { BrandMark } from "@/components/brand/brand-mark";

export default function MatchAcceptPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="text-sm text-[#5B616B]">Confirming your accept…</p>
        </Shell>
      }
    >
      <MatchAcceptInner />
    </Suspense>
  );
}

function MatchAcceptInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    alreadyAccepted: boolean;
    jobTitle: string;
    companyName: string | null;
    talentHeadline: string;
    linkedinUrl: string | null;
    linkedinEmailSent: boolean;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing accept token.");
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await fetch("/api/matches/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to accept match");
        setResult({
          alreadyAccepted: Boolean(json.alreadyAccepted),
          jobTitle: json.jobTitle,
          companyName: json.companyName,
          talentHeadline: json.talentHeadline,
          linkedinUrl: json.linkedinUrl,
          linkedinEmailSent: Boolean(json.linkedinEmailSent),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to accept match");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <Shell>
        <p className="text-sm text-[#5B616B]">Confirming your accept…</p>
      </Shell>
    );
  }

  if (error || !result) {
    return (
      <Shell>
        <h1 className="font-display text-2xl font-semibold text-[#2B5B84]">
          Unable to accept
        </h1>
        <p className="mt-3 text-sm text-destructive">
          {error || "Match not found"}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-9 items-center border border-[#2B5B84]/20 bg-white px-4 text-sm font-medium text-[#2B5B84]"
        >
          Sign in
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
        Match accepted
      </p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-[#2B5B84]">
        {result.alreadyAccepted ? "Already accepted" : "You’re in"}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#5B616B]">
        {result.alreadyAccepted
          ? "This match was already accepted. LinkedIn details are below if available."
          : "Thanks for accepting. We’ve emailed the candidate’s LinkedIn profile to you."}{" "}
        Role: <strong className="text-[#2A2D34]">{result.jobTitle}</strong>
        {result.companyName ? ` · ${result.companyName}` : ""}. Candidate:{" "}
        <strong className="text-[#2A2D34]">{result.talentHeadline}</strong>.
      </p>
      {result.linkedinUrl ? (
        <a
          href={result.linkedinUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex h-10 items-center bg-[#2B5B84] px-4 text-sm font-semibold text-white hover:bg-[#244e70]"
        >
          Open LinkedIn profile
        </a>
      ) : (
        <p className="mt-6 text-sm text-[#5B616B]">
          LinkedIn URL is not on file for this talent yet.
          {result.linkedinEmailSent
            ? ""
            : " We could not send a LinkedIn email."}
        </p>
      )}
      <p className="mt-8 text-sm">
        <Link href="/dashboard/employer" className="text-[#2B5B84] underline">
          Open employer dashboard
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100svh] bg-[#F7F6F3] text-[#2A2D34]">
      <header className="border-b border-[#2B5B84]/10 bg-white">
        <div className="mx-auto flex max-w-3xl items-center px-5 py-4 sm:px-8">
          <Link href="/">
            <BrandMark className="h-10 w-auto" />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}
