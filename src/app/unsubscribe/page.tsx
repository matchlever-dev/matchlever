import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import {
  emailFromUnsubscribeToken,
  maskEmail,
} from "@/lib/email/unsubscribe";

export const metadata: Metadata = {
  title: "Unsubscribe · MatchLever",
  description: "Stop automated emails from MatchLever.",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string; error?: string }>;
}) {
  const params = await searchParams;
  const done = params.done === "1";
  const invalid = params.error === "invalid";
  const email = params.token
    ? emailFromUnsubscribeToken(params.token)
    : null;

  return (
    <div className="flex min-h-[100svh] flex-col bg-[#F7F6F3] text-[#2A2D34]">
      <header className="border-b border-[#2B5B84]/10 bg-white/90">
        <div className="mx-auto flex max-w-lg items-center px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-7 w-auto" />
            <span className="font-display text-xs font-bold tracking-[0.16em] uppercase">
              MatchLever
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-12 sm:px-8">
        {done ? (
          <>
            <h1 className="font-display text-2xl font-semibold text-[#2B5B84]">
              You&apos;re unsubscribed
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#5B616B]">
              This address will no longer receive automated emails from
              MatchLever, including reference requests and profile reminders.
            </p>
          </>
        ) : invalid || (params.token && !email) ? (
          <>
            <h1 className="font-display text-2xl font-semibold text-[#2B5B84]">
              This unsubscribe link isn&apos;t valid
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#5B616B]">
              Use the unsubscribe link from a recent MatchLever email, or
              contact us if you keep getting messages.
            </p>
          </>
        ) : email && params.token ? (
          <>
            <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
              Email preferences
            </p>
            <h1 className="mt-3 font-display text-2xl font-semibold text-[#2B5B84]">
              Unsubscribe from automated emails
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#5B616B]">
              Stop automated MatchLever emails to{" "}
              <span className="font-medium text-[#2A2D34]">
                {maskEmail(email)}
              </span>
              , including reference requests and profile reminders. We
              won&apos;t email this address again unless you ask us to.
            </p>
            <form
              action="/api/email/unsubscribe"
              method="post"
              className="mt-6"
            >
              <input type="hidden" name="token" value={params.token} />
              <Button
                type="submit"
                className="h-10 bg-[#2B5B84] px-4 text-white hover:bg-[#244e71]"
              >
                Unsubscribe from automated emails
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold text-[#2B5B84]">
              Unsubscribe from automated emails
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#5B616B]">
              Open the unsubscribe link in a MatchLever email to stop future
              automated messages.
            </p>
          </>
        )}

        <p className="mt-8 text-sm">
          <Link href="/" className="text-[#2B5B84] underline underline-offset-2">
            Back to MatchLever
          </Link>
        </p>
      </main>
    </div>
  );
}
