"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { BrandMark } from "@/components/brand/brand-mark";
import { IncognitoProfileCard } from "@/components/matching/incognito-profile-card";
import { Button } from "@/components/ui/button";
import type { EmployerMatchView } from "@/lib/employer/job-matches";
import { employerResponseLabel } from "@/lib/matching/employer-response";

export function MatchViewPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="text-sm text-[#5B616B]">Loading match profile…</p>
        </Shell>
      }
    >
      <MatchViewInner />
    </Suspense>
  );
}

function MatchViewInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<EmployerMatchView | null>(null);
  const [busy, setBusy] = useState<"accept" | "pass" | null>(null);
  const [decisionResult, setDecisionResult] = useState<{
    decision: "accept" | "pass";
    alreadyDecided: boolean;
    linkedinUrl: string | null;
    linkedinEmailSent: boolean;
  } | null>(null);

  useEffect(() => {
    if (!token || token.length < 16) {
      setError("Missing or invalid match token.");
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await fetch(
          `/api/matches/view?token=${encodeURIComponent(token)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load match");
        setMatch(json.match as EmployerMatchView);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load match");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function decide(decision: "accept" | "pass") {
    if (!match || busy) return;
    setBusy(decision);
    setError(null);
    try {
      const res = await fetch("/api/matches/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: match.acceptToken, decision }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to record response");
      setDecisionResult({
        decision,
        alreadyDecided: Boolean(json.alreadyDecided),
        linkedinUrl: json.linkedinUrl ?? null,
        linkedinEmailSent: Boolean(json.linkedinEmailSent),
      });
      setMatch({
        ...match,
        employerResponse: decision === "accept" ? "accepted" : "passed",
        linkedinUrl:
          decision === "accept"
            ? json.linkedinUrl ?? match.linkedinUrl
            : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record response");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-sm text-[#5B616B]">Loading match profile…</p>
      </Shell>
    );
  }

  if (error && !match) {
    return (
      <Shell>
        <h1 className="font-display text-2xl font-semibold text-[#2B5B84]">
          Unable to open match
        </h1>
        <p className="mt-3 text-sm text-destructive">{error}</p>
        <Link
          href="/dashboard/employer"
          className="mt-6 inline-flex h-9 items-center border border-[#2B5B84]/20 bg-white px-4 text-sm font-medium text-[#2B5B84]"
        >
          Employer dashboard
        </Link>
      </Shell>
    );
  }

  if (!match) {
    return (
      <Shell>
        <p className="text-sm text-destructive">Match not found</p>
      </Shell>
    );
  }

  const pending = match.employerResponse === "pending";
  const accepted = match.employerResponse === "accepted";

  return (
    <Shell>
      <div className="mb-6">
        <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
          Match #{match.matchIndex}
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-[#2A2D34]">
          {match.jobTitle}
        </h1>
        <p className="mt-1 text-sm text-[#5B616B]">
          {match.companyName ? `${match.companyName} · ` : ""}
          Status:{" "}
          <strong className="text-[#2A2D34]">
            {employerResponseLabel(match.employerResponse)}
          </strong>
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#5B616B]">
          Same incognito profile from your match email. Identity stays hidden
          until you Accept. Pass keeps identity hidden.
        </p>
      </div>

      <IncognitoProfileCard profile={match.profile} />

      {decisionResult ? (
        <div className="mt-6 border border-[#2B5B84]/15 bg-white p-4 text-sm text-[#2A2D34]">
          <p className="font-medium text-[#2B5B84]">
            {decisionResult.decision === "accept"
              ? decisionResult.alreadyDecided
                ? "Already accepted"
                : "Match accepted"
              : decisionResult.alreadyDecided
                ? "Already passed"
                : "Match passed"}
          </p>
          <p className="mt-1 text-[#5B616B]">
            {decisionResult.decision === "accept"
              ? "We’ve emailed the candidate’s LinkedIn profile when available."
              : "Identity stays hidden. MatchLever can keep matching for this role."}
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {pending ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={busy !== null}
            className="h-10 bg-[#E87A5D] text-white hover:bg-[#d96b4f]"
            onClick={() => void decide("accept")}
          >
            {busy === "accept" ? "Accepting…" : "Accept"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            className="h-10 border-[#2B5B84] text-[#2B5B84]"
            onClick={() => void decide("pass")}
          >
            {busy === "pass" ? "Passing…" : "Pass"}
          </Button>
        </div>
      ) : null}

      {accepted && match.linkedinUrl ? (
        <a
          href={match.linkedinUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex h-10 items-center bg-[#2B5B84] px-4 text-sm font-semibold text-white hover:bg-[#244e70]"
        >
          Open LinkedIn profile
        </a>
      ) : null}

      {accepted && !match.linkedinUrl ? (
        <p className="mt-6 text-sm text-[#5B616B]">
          LinkedIn URL is not on file for this talent yet.
        </p>
      ) : null}

      <p className="mt-8 text-sm">
        <Link
          href={`/dashboard/employer/jobs/${match.jobId}`}
          className="text-[#2B5B84] underline"
        >
          Back to job opening
        </Link>
        {" · "}
        <Link href="/dashboard/employer" className="text-[#2B5B84] underline">
          Employer dashboard
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
