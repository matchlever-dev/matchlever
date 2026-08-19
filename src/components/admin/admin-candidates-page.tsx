"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Send } from "lucide-react";

import type { AdminCandidateRow, AdminReferenceRow } from "@/lib/admin/demo";
import {
  REQUIRED_VERIFIED_REFERENCES,
  formatTimezoneOffset,
} from "@/lib/dashboard/candidate";
import { LOCATION_MODES } from "@/lib/onboarding/schema";
import {
  AdminListControls,
  matchesKeyword,
  type AdminSortMode,
} from "@/components/admin/admin-list-controls";
import { PortalShell } from "@/components/admin/portal-shell";
import { ReferrerLinkedInLink } from "@/components/reference/referrer-linkedin-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ADMIN_LINKS = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/candidates", label: "Candidates" },
  { href: "/admin/contact", label: "Contact" },
];

const SUPERUSER_LINKS = [
  { href: "/superuser/candidates", label: "Candidates" },
  { href: "/superuser/manual-match", label: "Manual Match" },
];

const CANDIDATE_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "actively_looking", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "incomplete", label: "Incomplete" },
];

function missingLabels(missing: AdminCandidateRow["missing"]): string[] {
  const labels: string[] = [];
  if (missing.resume) labels.push("Resume");
  if (missing.profile) labels.push("Profile");
  if (missing.references) labels.push("References");
  return labels;
}

function statusLabel(status: string) {
  if (status === "actively_looking") return "Active";
  if (status === "on_hold") return "On Hold";
  if (status === "incomplete") return "Incomplete";
  return status.replaceAll("_", " ");
}

function formatLocationPreference(modes: string[]) {
  const known = LOCATION_MODES.filter((mode) => modes.includes(mode.value)).map(
    (mode) => mode.label
  );
  const extras = modes.filter(
    (mode) => !LOCATION_MODES.some((option) => option.value === mode)
  );
  const labels = [...known, ...extras];
  return labels.length ? labels.join(", ") : "To Be Completed";
}

export function AdminCandidatesPage() {
  return (
    <CandidateProfilesPage
      portalTitle="Admin Portal"
      links={ADMIN_LINKS}
      accent="admin"
      allowDelete
    />
  );
}

export function SuperuserCandidatesPage() {
  return (
    <CandidateProfilesPage
      portalTitle="Superuser Portal"
      links={SUPERUSER_LINKS}
      accent="superuser"
      allowDelete={false}
    />
  );
}

function CandidateProfilesPage({
  portalTitle,
  links,
  accent,
  allowDelete,
}: {
  portalTitle: string;
  links: { href: string; label: string }[];
  accent: "admin" | "superuser";
  allowDelete: boolean;
}) {
  const [candidates, setCandidates] = useState<AdminCandidateRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<AdminSortMode>("recent");
  const [statusFilter, setStatusFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/candidates");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load candidates");
      const list = (json.candidates ?? []) as AdminCandidateRow[];
      setCandidates(list);
      setDemo(Boolean(json.demo));
      setSelectedId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const list = candidates.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) {
        return false;
      }
      return matchesKeyword(keyword, [
        c.full_name,
        c.email,
        c.linkedin_url,
        c.headline,
        c.global_city,
        c.global_country,
        c.sanitized_summary,
        ...missingLabels(c.missing),
      ]);
    });

    return [...list].sort((a, b) => {
      if (sort === "score") {
        const sa = a.avg_authenticity_score ?? -1;
        const sb = b.avg_authenticity_score ?? -1;
        if (sb !== sa) return sb - sa;
      }
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
  }, [candidates, keyword, sort, statusFilter]);

  const selected = filtered.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (filtered.length === 0) return;
    if (!filtered.some((c) => c.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  async function setStatus(status: "actively_looking" | "on_hold") {
    if (!selected?.has_candidate_profile) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_status",
          candidateId: selected.id,
          status,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Status update failed");
      setCandidates((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, status } : c))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCandidate() {
    if (!allowDelete || !selected?.has_candidate_profile) return;
    if (
      !window.confirm(
        `Delete candidate profile for ${selected.full_name || selected.headline}?`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", candidateId: selected.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      // Keep the login user in the list, now without a candidate profile.
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? {
                ...c,
                id: c.user_id,
                has_candidate_profile: false,
                headline: null,
                status: "incomplete",
                global_city: null,
                global_country: null,
                timezone_offset: null,
                work_hours_start: null,
                work_hours_end: null,
                location_modes: [],
                raw_resume_text: null,
                sanitized_summary: null,
                avg_authenticity_score: null,
                references: [],
                missing: { resume: true, profile: true, references: true },
              }
            : c
        )
      );
      setSelectedId(selected.user_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell title={portalTitle} links={links} accent={accent}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
            Operations
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#2B5B84]">
            Candidate profiles
          </h1>
          <p className="mt-2 text-sm text-[#5B616B]">
            Every logged-in user, with missing resume, profile, or references
            called out.
          </p>
        </div>
        {demo && (
          <Badge variant="secondary" className="bg-[#E87A5D]/15 text-[#E87A5D]">
            Demo mode
          </Badge>
        )}
      </div>

      <AdminListControls
        sort={sort}
        onSortChange={setSort}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={CANDIDATE_STATUS_OPTIONS}
        keyword={keyword}
        onKeywordChange={setKeyword}
        keywordPlaceholder="Search name, email, headline, missing items…"
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-[#5B616B]">Loading candidates…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-2 border border-[#2B5B84]/15 bg-white p-3">
            {filtered.map((c) => {
              const missing = missingLabels(c.missing);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full border px-3 py-2 text-left transition-colors ${
                    selected?.id === c.id
                      ? "border-[#2B5B84] bg-[#2B5B84]/8"
                      : "border-transparent hover:bg-[#F7F6F3]"
                  }`}
                >
                  <p className="truncate text-sm font-medium text-[#2A2D34]">
                    {c.full_name || c.email || "Unnamed user"}
                  </p>
                  <p className="truncate text-xs text-[#5B616B]">
                    {c.headline ||
                      (c.has_candidate_profile
                        ? "No headline"
                        : "Onboarding not started")}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant={
                        c.status === "actively_looking"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {statusLabel(c.status)}
                    </Badge>
                    <span className="text-[11px] text-[#5B616B]">
                      Refs{" "}
                      {
                        c.references.filter((r) => r.status === "verified")
                          .length
                      }
                      /{REQUIRED_VERIFIED_REFERENCES}
                    </span>
                  </div>
                  {missing.length > 0 && (
                    <p className="mt-1.5 text-[11px] text-[#E87A5D]">
                      Missing: {missing.join(", ")}
                    </p>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="p-2 text-sm text-[#5B616B]">
                {candidates.length === 0
                  ? "No users yet."
                  : "No candidates match these filters."}
              </p>
            )}
          </aside>

          {selected && (
            <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-[#2B5B84]">
                    {selected.full_name ||
                      selected.headline ||
                      "Logged-in user"}
                  </h2>
                  <p className="mt-1 text-sm text-[#5B616B]">
                    {selected.email}
                    {selected.headline ? ` · ${selected.headline}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-[#5B616B]">
                    LinkedIn ·{" "}
                    <ReferrerLinkedInLink
                      url={selected.linkedin_url}
                      className="text-sm break-all"
                    />
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      busy ||
                      !selected.has_candidate_profile ||
                      selected.status === "actively_looking"
                    }
                    className="bg-[#2B5B84] text-white hover:bg-[#244e71]"
                    onClick={() => void setStatus("actively_looking")}
                  >
                    Active
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      busy ||
                      !selected.has_candidate_profile ||
                      selected.status === "on_hold"
                    }
                    onClick={() => void setStatus("on_hold")}
                  >
                    On Hold
                  </Button>
                  {allowDelete && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy || !selected.has_candidate_profile}
                      className="border-destructive/40 text-destructive"
                      onClick={() => void deleteCandidate()}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              <MissingChecklist missing={selected.missing} />

              <Tabs defaultValue="resume" className="mt-6">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-[#F7F6F3] p-1">
                  <TabsTrigger value="resume">Resume vs Summary</TabsTrigger>
                  <TabsTrigger value="location">Location & Hours</TabsTrigger>
                  <TabsTrigger value="references">Reference Audit</TabsTrigger>
                </TabsList>

                <TabsContent
                  value="resume"
                  className="mt-4 grid gap-4 md:grid-cols-2"
                >
                  <AuditBlock title="Un-sanitized Resume">
                    <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#2A2D34]">
                      {selected.raw_resume_text ||
                        (selected.missing.resume
                          ? "To Be Completed — no resume uploaded yet."
                          : "No raw resume stored.")}
                    </pre>
                  </AuditBlock>
                  <AuditBlock title="Sanitized Summary">
                    <p className="text-sm leading-relaxed text-[#2A2D34]">
                      {selected.sanitized_summary ||
                        "To Be Completed — no sanitized summary yet."}
                    </p>
                  </AuditBlock>
                </TabsContent>

                <TabsContent value="location" className="mt-4">
                  {!selected.has_candidate_profile ? (
                    <p className="text-sm text-[#5B616B]">
                      To Be Completed — this user has not finished onboarding,
                      so there is no candidate profile yet.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <AuditBlock title="Global location">
                        <p className="text-sm">
                          {[selected.global_city, selected.global_country]
                            .filter(Boolean)
                            .join(", ") || "To Be Completed"}
                        </p>
                      </AuditBlock>
                      <AuditBlock title="Timezone">
                        <p className="text-sm">
                          {selected.timezone_offset == null
                            ? "To Be Completed"
                            : formatTimezoneOffset(selected.timezone_offset)}
                        </p>
                      </AuditBlock>
                      <AuditBlock title="Working hours">
                        <p className="text-sm">
                          {selected.work_hours_start && selected.work_hours_end
                            ? `${selected.work_hours_start.slice(0, 5)} – ${selected.work_hours_end.slice(0, 5)}`
                            : "To Be Completed"}
                        </p>
                      </AuditBlock>
                      <AuditBlock title="Onsite / Remote / Hybrid">
                        <p className="text-sm">
                          {formatLocationPreference(selected.location_modes)}
                        </p>
                      </AuditBlock>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="references" className="mt-4 space-y-3">
                  <p className="text-xs text-[#5B616B]">
                    {
                      selected.references.filter((r) => r.status === "verified")
                        .length
                    }{" "}
                    of {REQUIRED_VERIFIED_REFERENCES} references verified
                  </p>
                  {padReferenceSlots(selected.references).map((slot, index) =>
                    slot ? (
                      <ReferenceCard key={slot.id} refRow={slot} />
                    ) : (
                      <EmptyReferenceSlot
                        key={`empty-${index}`}
                        slotNumber={index + 1}
                      />
                    )
                  )}
                </TabsContent>
              </Tabs>
            </section>
          )}
        </div>
      )}
    </PortalShell>
  );
}

function MissingChecklist({
  missing,
}: {
  missing: AdminCandidateRow["missing"];
}) {
  const items = [
    { key: "resume", label: "Resume", missing: missing.resume },
    { key: "profile", label: "Profile info", missing: missing.profile },
    { key: "references", label: "References", missing: missing.references },
  ] as const;

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.key}
          className={`border px-3 py-2 text-sm ${
            item.missing
              ? "border-[#E87A5D]/35 bg-[#E87A5D]/08 text-[#E87A5D]"
              : "border-[#2B5B84]/15 bg-[#F7F6F3] text-[#2A2D34]"
          }`}
        >
          <p className="font-display text-[10px] font-semibold tracking-[0.18em] uppercase">
            {item.label}
          </p>
          <p className="mt-1 text-xs">
            {item.missing ? "Missing — To Be Completed" : "Complete"}
          </p>
        </div>
      ))}
    </div>
  );
}

function padReferenceSlots(
  references: AdminReferenceRow[]
): Array<AdminReferenceRow | null> {
  const slots: Array<AdminReferenceRow | null> = [...references];
  while (slots.length < REQUIRED_VERIFIED_REFERENCES) {
    slots.push(null);
  }
  return slots;
}

function ReferenceCard({ refRow }: { refRow: AdminReferenceRow }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const verified = refRow.status === "verified";

  async function resend() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/candidates/references/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId: refRow.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Resend failed");
      setMessage(
        json.demo
          ? "Demo: reminder logged (add RESEND_API_KEY to send for real)."
          : `Reminder sent to ${refRow.reference_email}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resend failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`border p-4 ${
        refRow.lowTrust
          ? "border-[#E87A5D]/40 bg-[#E87A5D]/08"
          : "border-[#2B5B84]/10 bg-[#F7F6F3]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{refRow.reference_email}</p>
          <ReferrerLinkedInLink
            url={refRow.reference_linkedin_url}
            className="mt-1 block max-w-full truncate text-xs"
          />
        </div>
        <div className="text-right">
          <p className="font-display text-sm font-semibold text-[#2B5B84]">
            AI score:{" "}
            {refRow.authenticity_score === null
              ? "—"
              : refRow.authenticity_score}
          </p>
          <p className="text-[11px] text-[#5B616B] capitalize">
            {refRow.status}
          </p>
        </div>
      </div>
      {refRow.lowTrust && (
        <div className="mt-3 flex items-start gap-2 text-xs text-[#E87A5D]">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Low-trust warning
            {refRow.authenticity_flags.length
              ? `: ${refRow.authenticity_flags.join(", ")}`
              : "."}
          </span>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || verified}
          onClick={() => void resend()}
          className="h-8 gap-1.5 border-[#2B5B84]/25 text-[#2B5B84]"
        >
          <Send className="size-3.5" />
          {busy ? "Sending…" : "Resend Email"}
        </Button>
        {verified && (
          <p className="text-[11px] text-[#5B616B]">Already verified</p>
        )}
      </div>
      {message && (
        <p className="mt-2 text-xs text-[#2B5B84]">{message}</p>
      )}
      {error && <p className="mt-2 text-xs text-[#E87A5D]">{error}</p>}
    </div>
  );
}

function EmptyReferenceSlot({ slotNumber }: { slotNumber: number }) {
  return (
    <div className="border border-dashed border-[#2B5B84]/25 bg-[#F7F6F3]/60 p-4">
      <p className="font-display text-[10px] font-semibold tracking-[0.2em] text-[#5B616B] uppercase">
        Reference {slotNumber}
      </p>
      <p className="mt-2 text-sm text-[#5B616B]">To Be Completed</p>
    </div>
  );
}

function AuditBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[#2B5B84]/10 bg-[#F7F6F3] p-4">
      <p className="font-display text-[10px] font-semibold tracking-[0.2em] text-[#5B616B] uppercase">
        {title}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
