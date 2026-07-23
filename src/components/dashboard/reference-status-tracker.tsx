"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, Send } from "lucide-react";

import type { SeekerReferenceRow } from "@/lib/dashboard/seeker";
import { Button } from "@/components/ui/button";

export function ReferenceStatusTracker({
  references,
  onChanged,
}: {
  references: SeekerReferenceRow[];
  onChanged?: () => void;
}) {
  const verified = references.filter((r) => r.status === "verified").length;
  const total = references.length;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function resend(referenceId: string) {
    setBusyId(referenceId);
    setMessage(null);
    try {
      const res = await fetch("/api/dashboard/seeker/references/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resend failed");
      setMessage(
        data.demo
          ? "Demo: invite link logged (add RESEND_API_KEY to send for real)."
          : `Invite resent to reference.`
      );
      onChanged?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Resend failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
            References
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold text-[#2B5B84]">
            {verified} of {total || 3} Complete
          </h2>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {references.map((ref) => {
          const done = ref.status === "verified";
          return (
            <li
              key={ref.id}
              className="flex flex-col gap-3 border border-[#2B5B84]/10 bg-[#F7F6F3] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {done ? (
                    <CheckCircle2 className="size-4 text-[#2B5B84]" />
                  ) : (
                    <Clock3 className="size-4 text-[#E87A5D]" />
                  )}
                  <p className="truncate text-sm font-medium text-[#2A2D34]">
                    {ref.reference_name || ref.reference_email}
                  </p>
                </div>
                <p className="mt-1 truncate text-xs text-[#5B616B]">
                  {ref.reference_email}
                  {ref.relationship ? ` · ${ref.relationship}` : ""}
                  {" · "}
                  {done ? "Verified" : "Awaiting response"}
                </p>
              </div>
              {!done && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busyId === ref.id}
                  onClick={() => void resend(ref.id)}
                  className="h-10 gap-2 border-[#2B5B84]/25 text-[#2B5B84]"
                >
                  <Send className="size-3.5" />
                  {busyId === ref.id ? "Sending…" : "Resend Link"}
                </Button>
              )}
            </li>
          );
        })}
        {references.length === 0 && (
          <li className="text-sm text-[#5B616B]">
            No references yet. Complete onboarding to invite managers/peers.
          </li>
        )}
      </ul>

      {message && (
        <p className="mt-4 text-xs text-[#2B5B84]">{message}</p>
      )}
    </section>
  );
}
