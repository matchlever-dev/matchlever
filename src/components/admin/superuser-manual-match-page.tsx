"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  ActiveCandidateOption,
  ActiveJobPosting,
} from "@/lib/admin/demo";
import { PortalShell } from "@/components/admin/portal-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const SUPER_LINKS = [
  { href: "/superuser/directory", label: "Directory" },
  { href: "/superuser/manual-match", label: "Manual Match" },
];

export function SuperuserManualMatchPage() {
  const [candidates, setCandidates] = useState<ActiveCandidateOption[]>([]);
  const [jobs, setJobs] = useState<ActiveJobPosting[]>([]);
  const [candidateId, setCandidateId] = useState<string>("");
  const [jobId, setJobId] = useState<string>("");
  const [column, setColumn] = useState("sourced");
  const [notes, setNotes] = useState("Concierge Match");
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/superuser/manual-match");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load match tools");
      const nextCandidates = (json.candidates ?? []) as ActiveCandidateOption[];
      const nextJobs = (json.jobs ?? []) as ActiveJobPosting[];
      setCandidates(nextCandidates);
      setJobs(nextJobs);
      setDemo(Boolean(json.demo));
      setCandidateId((prev) => prev || nextCandidates[0]?.id || "");
      setJobId((prev) => prev || nextJobs[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === jobId) ?? null,
    [jobs, jobId]
  );

  useEffect(() => {
    if (!selectedJob) return;
    const cols = selectedJob.kanban_columns;
    if (!cols.includes(column)) {
      setColumn(cols[0] || "sourced");
    }
  }, [selectedJob, column]);

  async function pushMatch() {
    if (!candidateId || !jobId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/superuser/manual-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateProfileId: candidateId,
          jobPostingId: jobId,
          kanbanColumn: column,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Match failed");
      setMessage(
        json.demo
          ? "Demo Concierge Match recorded (is_manual_match = true)."
          : "Concierge Match pushed to the job Kanban board."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Match failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell title="Superuser Portal" links={SUPER_LINKS} accent="superuser">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
            Concierge
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#2B5B84]">
            Manual match
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#5B616B]">
            Select any active candidate and push them into an active job
            posting Kanban as a Concierge Match (`is_manual_match = true`).
          </p>
        </div>
        {demo && (
          <Badge variant="secondary" className="bg-[#E87A5D]/15 text-[#E87A5D]">
            Demo mode
          </Badge>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[#5B616B]">Loading match tools…</p>
      ) : (
        <div className="grid max-w-2xl gap-5 border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
          <Field label="Active candidate">
            <Select
              value={candidateId}
              onValueChange={(value) => setCandidateId(value ?? "")}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Select candidate" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {(c.full_name || c.headline || c.id) +
                      (c.headline ? ` — ${c.headline}` : "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Active job posting">
            <Select
              value={jobId}
              onValueChange={(value) => setJobId(value ?? "")}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Select job" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.title}
                    {j.company_name ? ` · ${j.company_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Kanban column">
            <Select
              value={column}
              onValueChange={(value) => setColumn(value ?? "sourced")}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Column" />
              </SelectTrigger>
              <SelectContent>
                {(selectedJob?.kanban_columns ?? ["sourced"]).map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </Field>

          <Button
            type="button"
            disabled={busy || !candidateId || !jobId}
            className="h-11 bg-[#E87A5D] text-white hover:bg-[#d96b4f]"
            onClick={() => void pushMatch()}
          >
            {busy ? "Pushing…" : "Push Concierge Match"}
          </Button>

          {message && <p className="text-sm text-[#2B5B84]">{message}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {selectedJob && (
            <div className="border-t border-[#2B5B84]/10 pt-4">
              <p className="font-display text-[10px] font-semibold tracking-[0.2em] text-[#5B616B] uppercase">
                Board preview
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedJob.kanban_columns.map((col) => (
                  <div
                    key={col}
                    className={`min-w-[88px] border px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide ${
                      col === column
                        ? "border-[#E87A5D] bg-[#E87A5D]/10 text-[#E87A5D]"
                        : "border-[#2B5B84]/15 text-[#5B616B]"
                    }`}
                  >
                    {col}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PortalShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
