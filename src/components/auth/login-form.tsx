"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { BrandMark, BrandWordmark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { sanitizeNextPath } from "@/lib/auth/post-login-redirect";
import { setStaySignedInPreference } from "@/lib/auth/stay-signed-in";
import { createClient } from "@/lib/supabase/client";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = sanitizeNextPath(searchParams.get("next"));
  const queryError = searchParams.get("error");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(true);

  const audienceHint = useMemo(() => {
    if (next?.startsWith("/admin")) return "Admin portal access";
    if (next?.startsWith("/superuser")) return "Superuser portal access";
    if (next?.startsWith("/dashboard")) return "Candidate dashboard access";
    return "Candidates, admins, and superusers";
  }, [next]);

  async function signInWithLinkedIn() {
    setOauthError(null);
    setBusy(true);
    try {
      setStaySignedInPreference(staySignedIn);
      const supabase = createClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      if (next) redirectTo.searchParams.set("next", next);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "linkedin_oidc",
        options: {
          redirectTo: redirectTo.toString(),
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        setOauthError(error.message);
        setBusy(false);
        return;
      }

      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (err) {
      setOauthError(
        err instanceof Error ? err.message : "Unable to start LinkedIn sign-in."
      );
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-8">
      <div className="space-y-4">
        <Link href="/" className="inline-flex items-center gap-3">
          <BrandMark className="h-12 w-auto" />
        </Link>
        <BrandWordmark />
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#2B5B84]">
            Log in
          </h1>
          <p className="mt-2 text-sm text-[#2A2D34]/70">{audienceHint}</p>
          <p className="mt-1 text-sm text-[#2A2D34]/60">
            Sign in with LinkedIn to return to your dashboard or staff portal.
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#2B5B84]/15 bg-[#F7F6F3] px-3 py-3 text-sm text-[#2A2D34]">
        <input
          type="checkbox"
          checked={staySignedIn}
          onChange={(e) => setStaySignedIn(e.target.checked)}
          className="mt-0.5 size-4 accent-[#2B5B84]"
        />
        <span>
          <span className="font-medium text-[#2B5B84]">Stay signed in</span>
          <span className="mt-0.5 block text-xs text-[#5B616B]">
            Keep this browser signed in for 60 minutes so you won&apos;t need to
            authenticate again during that window.
          </span>
        </span>
      </label>

      <Button
        type="button"
        size="lg"
        disabled={busy}
        onClick={() => void signInWithLinkedIn()}
        className="h-12 w-full gap-2 bg-[#0A66C2] text-white hover:bg-[#004182]"
      >
        <LinkedInIcon className="size-5" />
        {busy ? "Redirecting…" : "Continue with LinkedIn"}
      </Button>

      {(oauthError || queryError) && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {oauthError || queryError}
        </p>
      )}

      <div className="space-y-2 text-sm text-[#2A2D34]/70">
        <p>
          New candidate?{" "}
          <Link
            href="/onboarding"
            className="font-semibold text-[#2B5B84] underline underline-offset-2"
          >
            Start onboarding
          </Link>
        </p>
        <p className="text-xs text-[#2A2D34]/50">
          Admins and superusers use the same LinkedIn login. Access is granted
          by role on your MatchLever account.
        </p>
      </div>
    </div>
  );
}
