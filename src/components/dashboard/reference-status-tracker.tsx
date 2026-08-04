"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, Pencil, Send, X } from "lucide-react";

import type { CandidateReferenceRow } from "@/lib/dashboard/candidate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function EditReferenceForm({
  reference,
  busy,
  onCancel,
  onSaved,
}: {
  reference: CandidateReferenceRow;
  busy: boolean;
  onCancel: () => void;
  onSaved: (payload: {
    unchanged?: boolean;
    warning?: string;
    demo?: boolean;
    inviteSent?: boolean;
  }) => void;
}) {
  const [draftEmail, setDraftEmail] = useState(reference.reference_email || "");
  const [draftLinkedIn, setDraftLinkedIn] = useState(
    reference.reference_linkedin_url?.trim() || ""
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/dashboard/candidate/references", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceId: reference.id,
          email: draftEmail,
          linkedInUrl: draftLinkedIn,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      onSaved(data);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  const disabled = busy || saving;

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`ref-email-${reference.id}`}>Email</Label>
        <input
          id={`ref-email-${reference.id}`}
          type="email"
          value={draftEmail}
          disabled={disabled}
          onChange={(e) => setDraftEmail(e.target.value)}
          autoComplete="off"
          className="h-10 w-full rounded-md border border-[#2B5B84]/20 bg-white px-2.5 text-sm outline-none focus-visible:border-[#2B5B84] focus-visible:ring-2 focus-visible:ring-[#2B5B84]/20"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`ref-linkedin-${reference.id}`}>
          LinkedIn profile URL
        </Label>
        <input
          id={`ref-linkedin-${reference.id}`}
          type="text"
          inputMode="url"
          value={draftLinkedIn}
          disabled={disabled}
          onChange={(e) => setDraftLinkedIn(e.target.value)}
          autoComplete="off"
          placeholder="https://www.linkedin.com/in/their-profile"
          className="h-10 w-full rounded-md border border-[#2B5B84]/20 bg-white px-2.5 text-sm outline-none focus-visible:border-[#2B5B84] focus-visible:ring-2 focus-visible:ring-[#2B5B84]/20"
        />
      </div>
      {localError && (
        <p className="text-xs text-destructive">{localError}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={disabled || !draftEmail.trim() || !draftLinkedIn.trim()}
          onClick={() => void save()}
          className="h-10 bg-[#2B5B84] text-white hover:bg-[#244e71]"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={onCancel}
          className="h-10 border-[#2B5B84]/25 text-[#2B5B84]"
          aria-label="Cancel edit"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function ReferenceStatusTracker({
  references,
  onChanged,
}: {
  references: CandidateReferenceRow[];
  onChanged?: () => void;
}) {
  const verified = references.filter((r) => r.status === "verified").length;
  const total = references.length;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function resend(referenceId: string) {
    setBusyId(referenceId);
    setMessage(null);
    try {
      const res = await fetch("/api/dashboard/candidate/references/resend", {
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
          const editing = editingId === ref.id;
          const busy = busyId === ref.id;
          return (
            <li
              key={ref.id}
              className="flex flex-col gap-3 border border-[#2B5B84]/10 bg-[#F7F6F3] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-[#2B5B84]" />
                    ) : (
                      <Clock3 className="size-4 shrink-0 text-[#E87A5D]" />
                    )}
                    <p className="truncate text-sm font-medium text-[#2A2D34]">
                      {ref.reference_name || ref.reference_email}
                    </p>
                  </div>
                  {!editing && (
                    <div className="mt-1 space-y-0.5 text-xs text-[#5B616B]">
                      <p className="truncate">{ref.reference_email}</p>
                      <p className="truncate">
                        {ref.reference_linkedin_url || "No LinkedIn URL"}
                      </p>
                      <p>
                        {ref.relationship ? `${ref.relationship} · ` : ""}
                        {done ? "Verified" : "Awaiting response"}
                      </p>
                    </div>
                  )}
                </div>
                {!done && !editing && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(ref.id);
                        setMessage(null);
                      }}
                      className="h-10 gap-2 border-[#2B5B84]/25 text-[#2B5B84]"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void resend(ref.id)}
                      className="h-10 gap-2 border-[#2B5B84]/25 text-[#2B5B84]"
                    >
                      <Send className="size-3.5" />
                      {busy ? "Sending…" : "Resend Link"}
                    </Button>
                  </div>
                )}
              </div>

              {editing && (
                <EditReferenceForm
                  key={ref.id}
                  reference={ref}
                  busy={busy}
                  onCancel={() => setEditingId(null)}
                  onSaved={(data) => {
                    setEditingId(null);
                    if (data.unchanged) {
                      setMessage("No changes to save.");
                    } else if (data.warning) {
                      setMessage(data.warning);
                    } else if (data.demo) {
                      setMessage("Demo: reference updated.");
                    } else {
                      setMessage(
                        data.inviteSent
                          ? "Reference updated and invite sent."
                          : "Reference updated."
                      );
                    }
                    onChanged?.();
                  }}
                />
              )}
            </li>
          );
        })}
        {references.length === 0 && (
          <li className="text-sm text-[#5B616B]">
            No references yet. Complete onboarding to invite managers or peers.
          </li>
        )}
      </ul>

      {message && (
        <p className="mt-4 text-xs text-[#2B5B84]">{message}</p>
      )}
    </section>
  );
}
