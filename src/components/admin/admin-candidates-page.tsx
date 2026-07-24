"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import type { AdminCandidateRow } from "@/lib/admin/demo";
import { formatTimezoneOffset } from "@/lib/dashboard/seeker";
import { PortalShell } from "@/components/admin/portal-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ADMIN_LINKS = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/candidates", label: "Candidates" },
];

export function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<AdminCandidateRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      setSelectedId((prev) => prev ?? list[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected =
    candidates.find((c) => c.id === selectedId) ?? candidates[0] ?? null;

  async function setStatus(status: "actively_looking" | "on_hold") {
    if (!selected) return;
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
    if (!selected) return;
    if (!window.confirm(`Delete candidate profile for ${selected.full_name || selected.headline}?`)) {
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
      const next = candidates.filter((c) => c.id !== selected.id);
      setCandidates(next);
      setSelectedId(next[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell title="Admin Portal" links={ADMIN_LINKS}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
            Operations
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#2B5B84]">
            Candidate profiles
          </h1>
        </div>
        {demo && (
          <Badge variant="secondary" className="bg-[#E87A5D]/15 text-[#E87A5D]">
            Demo mode
          </Badge>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-[#5B616B]">Loading candidates…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-2 border border-[#2B5B84]/15 bg-white p-3">
            {candidates.map((c) => (
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
                  {c.headline || "Untitled"}
                </p>
                <p className="truncate text-xs text-[#5B616B]">
                  {c.full_name || c.email || c.id}
                </p>
                <Badge
                  className="mt-2"
                  variant={
                    c.status === "actively_looking" ? "default" : "secondary"
                  }
                >
                  {c.status === "actively_looking" ? "Active" : "On Hold"}
                </Badge>
              </button>
            ))}
            {candidates.length === 0 && (
              <p className="p-2 text-sm text-[#5B616B]">No candidates yet.</p>
            )}
          </aside>

          {selected && (
            <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-[#2B5B84]">
                    {selected.headline || "Candidate"}
                  </h2>
                  <p className="mt-1 text-sm text-[#5B616B]">
                    {selected.full_name} · {selected.email}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy || selected.status === "actively_looking"}
                    className="bg-[#2B5B84] text-white hover:bg-[#244e71]"
                    onClick={() => void setStatus("actively_looking")}
                  >
                    Active
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || selected.status === "on_hold"}
                    onClick={() => void setStatus("on_hold")}
                  >
                    On Hold
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    className="border-destructive/40 text-destructive"
                    onClick={() => void deleteCandidate()}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="resume" className="mt-6">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-[#F7F6F3] p-1">
                  <TabsTrigger value="resume">Resume vs Summary</TabsTrigger>
                  <TabsTrigger value="location">Location & Hours</TabsTrigger>
                  <TabsTrigger value="references">Reference Audit</TabsTrigger>
                </TabsList>

                <TabsContent value="resume" className="mt-4 grid gap-4 md:grid-cols-2">
                  <AuditBlock title="Un-sanitized Resume">
                    <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#2A2D34]">
                      {selected.raw_resume_text || "No raw resume stored."}
                    </pre>
                  </AuditBlock>
                  <AuditBlock title="Sanitized Summary">
                    <p className="text-sm leading-relaxed text-[#2A2D34]">
                      {selected.sanitized_summary || "No sanitized summary yet."}
                    </p>
                  </AuditBlock>
                </TabsContent>

                <TabsContent value="location" className="mt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AuditBlock title="Global location">
                      <p className="text-sm">
                        {[selected.global_city, selected.global_country]
                          .filter(Boolean)
                          .join(", ") || "Not set"}
                      </p>
                    </AuditBlock>
                    <AuditBlock title="Timezone">
                      <p className="text-sm">
                        {formatTimezoneOffset(selected.timezone_offset)}
                      </p>
                    </AuditBlock>
                    <AuditBlock title="Working hours">
                      <p className="text-sm">
                        {selected.work_hours_start && selected.work_hours_end
                          ? `${selected.work_hours_start.slice(0, 5)} – ${selected.work_hours_end.slice(0, 5)}`
                          : "Not set"}
                      </p>
                    </AuditBlock>
                  </div>
                </TabsContent>

                <TabsContent value="references" className="mt-4 space-y-3">
                  {selected.references.map((ref) => (
                    <div
                      key={ref.id}
                      className={`border p-4 ${
                        ref.lowTrust
                          ? "border-[#E87A5D]/40 bg-[#E87A5D]/08"
                          : "border-[#2B5B84]/10 bg-[#F7F6F3]"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{ref.reference_email}</p>
                          <p className="mt-1 text-xs text-[#5B616B]">
                            {ref.reference_linkedin_url || "No LinkedIn URL"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-sm font-semibold text-[#2B5B84]">
                            AI score:{" "}
                            {ref.authenticity_score === null
                              ? "—"
                              : ref.authenticity_score}
                          </p>
                          <p className="text-[11px] text-[#5B616B] capitalize">
                            {ref.status}
                          </p>
                        </div>
                      </div>
                      {ref.lowTrust && (
                        <div className="mt-3 flex items-start gap-2 text-xs text-[#E87A5D]">
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                          <span>
                            Low-trust warning
                            {ref.authenticity_flags.length
                              ? `: ${ref.authenticity_flags.join(", ")}`
                              : "."}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {selected.references.length === 0 && (
                    <p className="text-sm text-[#5B616B]">No references on file.</p>
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
