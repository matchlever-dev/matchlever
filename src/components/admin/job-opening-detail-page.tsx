"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import type { AdminJobMatchRow, ActiveTalentOption } from "@/lib/admin/demo";
import { matchBillingLabel } from "@/lib/matching/billing";
import { talentStatusLabel } from "@/lib/matching/eligibility";
import {
  formatJobLocationLine,
  jobOpeningStatusLabel,
} from "@/lib/employer/job-opening-schema";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
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

type JobDetail = {
  id: string;
  title: string;
  status: string;
  company_name: string | null;
  employer_name: string | null;
  employer_email: string | null;
  description: string | null;
  verified_skills: string[];
  years_experience: number | null;
  suggested_taglines: string[];
  location_modes: string[];
  global_city: string | null;
  min_salary: number | null;
  timezone: string | null;
  work_hours_start: string | null;
  work_hours_end: string | null;
  visa_statuses: string[];
  kanban_columns: string[];
  match_count: number;
  accepted_count: number;
  free_match_count: number;
  invoiced_match_count: number;
};

export function AdminJobOpeningDetailPage({ jobId }: { jobId: string }) {
  return (
    <JobOpeningDetail
      jobId={jobId}
      portal="admin"
      listHref="/admin/job-openings"
    />
  );
}

export function SuperuserJobOpeningDetailPage({
  jobId,
  links,
}: {
  jobId: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <JobOpeningDetail
      jobId={jobId}
      portal="superuser"
      links={links}
      listHref="/superuser/job-openings"
    />
  );
}

function JobOpeningDetail({
  jobId,
  portal,
  links,
  listHref,
}: {
  jobId: string;
  portal: "admin" | "superuser";
  links?: readonly { href: string; label: string }[];
  listHref: string;
}) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [matches, setMatches] = useState<AdminJobMatchRow[]>([]);
  const [talent, setTalent] = useState<ActiveTalentOption[]>([]);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [talentId, setTalentId] = useState("");
  const [notes, setNotes] = useState("Manual match");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/job-openings/${jobId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load job opening");
      setJob(json.job as JobDetail);
      setMatches((json.matches ?? []) as AdminJobMatchRow[]);
      const nextTalent = (json.matchableTalent ?? []) as ActiveTalentOption[];
      setTalent(nextTalent);
      setTalentId((prev) =>
        prev && nextTalent.some((t) => t.id === prev)
          ? prev
          : nextTalent[0]?.id || ""
      );
      setAiMessage(json.aiMatch?.message ?? null);
      setDemo(Boolean(json.demo));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function assignMatch() {
    if (!talentId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/job-openings/${jobId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          talentProfileId: talentId,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Match failed");
      setMessage(
        json.demo
          ? `Demo match recorded as ${json.match.billingStatus} (#${json.match.matchIndex}).`
          : `Matched. Billing: ${json.match.billingStatus} (#${json.match.matchIndex}). Employer email ${json.match.employerEmailSent ? "sent" : "not sent"}.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Match failed");
    } finally {
      setBusy(false);
    }
  }

  const body = (
    <>
      <div className="mb-6">
        <Link
          href={listHref}
          className="text-xs font-semibold tracking-wide text-[#2B5B84] uppercase hover:underline"
        >
          ← Job openings
        </Link>
        {demo && (
          <Badge
            variant="secondary"
            className="ml-3 bg-[#E87A5D]/15 text-[#E87A5D]"
          >
            Demo mode
          </Badge>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[#5B616B]">Loading job opening…</p>
      ) : error && !job ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : job ? (
        <div className="grid gap-8">
          <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#5B616B] uppercase">
                  Job opening
                </p>
                <h1 className="mt-2 font-display text-2xl font-semibold text-[#2B5B84]">
                  {job.title}
                </h1>
                <p className="mt-2 text-sm text-[#5B616B]">
                  {job.company_name || "Company TBD"}
                  {job.employer_name ? ` · ${job.employer_name}` : ""}
                  {job.employer_email ? ` · ${job.employer_email}` : ""}
                </p>
              </div>
              <Badge variant="secondary">
                {jobOpeningStatusLabel(job.status)}
              </Badge>
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Detail
                label="Location"
                value={formatJobLocationLine({
                  locationModes: job.location_modes,
                  globalCity: job.global_city,
                })}
              />
              <Detail
                label="Min salary"
                value={
                  job.min_salary
                    ? `$${job.min_salary.toLocaleString("en-US")}`
                    : "—"
                }
              />
              <Detail
                label="Experience"
                value={
                  job.years_experience != null
                    ? `${job.years_experience} years`
                    : "—"
                }
              />
              <Detail label="Timezone" value={job.timezone || "—"} />
              <Detail
                label="Work hours"
                value={
                  job.work_hours_start && job.work_hours_end
                    ? `${job.work_hours_start.slice(0, 5)} – ${job.work_hours_end.slice(0, 5)}`
                    : "—"
                }
              />
              <Detail
                label="Visa / work auth"
                value={job.visa_statuses.join(", ") || "—"}
              />
            </dl>

            {job.verified_skills.length > 0 && (
              <div className="mt-5">
                <p className="font-display text-[10px] font-semibold tracking-[0.2em] text-[#5B616B] uppercase">
                  Verified skills
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.verified_skills.map((skill) => (
                    <span
                      key={skill}
                      className="border border-[#2B5B84]/20 bg-[#F7F6F3] px-2.5 py-1 text-xs font-medium text-[#2B5B84]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.description && (
              <div className="mt-5">
                <p className="font-display text-[10px] font-semibold tracking-[0.2em] text-[#5B616B] uppercase">
                  Description
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#2A2D34]">
                  {job.description}
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-4 border-t border-[#2B5B84]/10 pt-4 text-xs text-[#5B616B]">
              <span>
                Matches:{" "}
                <strong className="text-[#2A2D34]">{job.match_count}</strong>
              </span>
              <span>
                Accepted:{" "}
                <strong className="text-[#2A2D34]">{job.accepted_count}</strong>
              </span>
              <span>
                Free:{" "}
                <strong className="text-[#2A2D34]">
                  {job.free_match_count}
                </strong>
              </span>
              <span>
                Invoiced:{" "}
                <strong className="text-[#2A2D34]">
                  {job.invoiced_match_count}
                </strong>
              </span>
            </div>
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#2B5B84]">
                  Matched candidates
                </h2>
                <p className="mt-1 text-sm text-[#5B616B]">
                  Manual assign from Active or On Hold talent. Incomplete
                  profiles are excluded.
                </p>
              </div>
            </div>

            <div className="mb-6 grid gap-4 border border-[#2B5B84]/15 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-end sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Assignable talent</Label>
                  <Select
                    value={talentId}
                    onValueChange={(value) => setTalentId(value ?? "")}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="Select talent" />
                    </SelectTrigger>
                    <SelectContent>
                      {talent.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {(t.full_name || t.headline || t.id) +
                            ` · ${talentStatusLabel(t.status)}` +
                            (t.headline ? ` — ${t.headline}` : "")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {talent.length === 0 && (
                    <p className="text-xs text-[#5B616B]">
                      No matchable talent left for this opening.
                    </p>
                  )}
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <Button
                type="button"
                disabled={busy || !talentId}
                className="h-11 bg-[#E87A5D] text-white hover:bg-[#d96b4f]"
                onClick={() => void assignMatch()}
              >
                {busy ? "Matching…" : "Assign match"}
              </Button>
            </div>

            {aiMessage && (
              <p className="mb-4 border border-dashed border-[#2B5B84]/25 bg-[#2B5B84]/[0.04] px-4 py-3 text-xs text-[#5B616B]">
                AI matching stub: {aiMessage}
              </p>
            )}

            {message && <p className="mb-3 text-sm text-[#2B5B84]">{message}</p>}
            {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

            {matches.length === 0 ? (
              <p className="text-sm text-[#5B616B]">
                No candidates matched yet.
              </p>
            ) : (
              <div className="grid gap-3">
                {matches.map((m) => (
                  <article
                    key={m.id}
                    className="border border-[#2B5B84]/15 bg-white p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base font-semibold text-[#2A2D34]">
                          #{m.match_index}{" "}
                          {m.talent_name || m.talent_headline || m.talent_profile_id}
                        </h3>
                        <p className="mt-1 text-sm text-[#5B616B]">
                          {m.talent_headline || "—"} ·{" "}
                          {talentStatusLabel(m.talent_status)} ·{" "}
                          {m.match_source === "ai" ? "AI" : "Manual"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {matchBillingLabel(m.billing_status)}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={
                            m.accepted
                              ? "bg-[#2B5B84]/15 text-[#2B5B84]"
                              : "bg-[#5B616B]/10 text-[#5B616B]"
                          }
                        >
                          {m.accepted ? "Accepted" : "Pending accept"}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5B616B]">
                      <span>Cycle {m.invoice_cycle}</span>
                      <span>Column: {m.kanban_column}</span>
                      <span>
                        Notified:{" "}
                        {m.employer_notified_at
                          ? new Date(m.employer_notified_at).toLocaleString()
                          : "—"}
                      </span>
                      <span>
                        LinkedIn sent:{" "}
                        {m.linkedin_sent_at
                          ? new Date(m.linkedin_sent_at).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                    {m.notes && (
                      <p className="mt-2 text-xs text-[#5B616B]">{m.notes}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );

  if (portal === "admin") {
    return (
      <AdminPortalShell title={job?.title || "Job opening"}>
        {body}
      </AdminPortalShell>
    );
  }

  return (
    <PortalShell
      title="Superuser Portal"
      links={links ?? []}
      accent="superuser"
    >
      {body}
    </PortalShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-display text-[10px] font-semibold tracking-[0.2em] text-[#5B616B] uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-[#2A2D34]">{value}</dd>
    </div>
  );
}
