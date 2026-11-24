"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { JobOpeningFormValues } from "@/lib/employer/job-opening-schema";
import {
  formatJobLocationLine,
  jobOpeningStatusLabel,
} from "@/lib/employer/job-opening-schema";
import { isFounderPromoEligible } from "@/lib/employer/billing";
import { BrandMark } from "@/components/brand/brand-mark";
import { JobOpeningForm } from "@/components/employer/job-opening-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function JobOpeningCreatePage() {
  const router = useRouter();
  const [founderEligible, setFounderEligible] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | undefined>();
  const [freeMatchesUsed, setFreeMatchesUsed] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/employer");
        const json = await res.json().catch(() => ({}));
        if (res.status === 401) {
          router.replace("/login?next=/dashboard/employer/jobs/new");
          return;
        }
        if (res.status === 404 && json.code === "PROFILE_MISSING") {
          router.replace("/employer/onboarding#employer-form");
          return;
        }
        if (!res.ok) return;
        setCreatedAt(json.billing?.createdAt);
        setFreeMatchesUsed(json.billing?.freeMatchesUsed ?? 0);
        setFounderEligible(
          isFounderPromoEligible({
            createdAt: json.billing?.createdAt ?? new Date().toISOString(),
            freeMatchesUsed: json.billing?.freeMatchesUsed ?? 0,
          })
        );
      } catch {
        // Ignore — form still works with default banner rules.
      }
    })();
  }, [router]);

  return (
    <Shell title="New job opening">
      <JobOpeningForm
        founderEligible={founderEligible}
        employerCreatedAt={createdAt}
        freeMatchesUsed={freeMatchesUsed}
        onSaved={({ id }) => router.push(`/dashboard/employer/jobs/${id}`)}
      />
    </Shell>
  );
}

export function JobOpeningDetailPage({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formValues, setFormValues] = useState<Partial<JobOpeningFormValues> | null>(
    null
  );
  const [job, setJob] = useState<{
    id: string;
    title: string;
    status: string;
    locationModes: string[];
    globalCity: string | null;
    minSalary: number | null;
  } | null>(null);
  const [founderEligible, setFounderEligible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobRes, dashRes] = await Promise.all([
        fetch(`/api/employer/jobs/${jobId}`),
        fetch("/api/dashboard/employer"),
      ]);
      const jobJson = await jobRes.json();
      if (!jobRes.ok) throw new Error(jobJson.error || "Unable to load job");
      setJob(jobJson.job);
      setFormValues(jobJson.formValues);
      if (dashRes.ok) {
        const dash = await dashRes.json();
        setFounderEligible(
          isFounderPromoEligible({
            createdAt: dash.billing?.createdAt ?? new Date().toISOString(),
            freeMatchesUsed: dash.billing?.freeMatchesUsed ?? 0,
          })
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load job");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(status: "active" | "paused" | "hired" | "closed") {
    if (!job) return;
    setStatusBusy(true);
    setStatusMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/employer/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to update status");
      setJob({ ...job, status: json.status || status });
      setStatusMessage(
        status === "hired"
          ? "Marked Hired. Matching is stopped for this opening."
          : status === "paused"
            ? "Opening paused. Matching can still continue until you mark Hired."
            : status === "closed"
              ? "Opening closed. Matching is stopped."
              : "Opening set back to Active."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status");
    } finally {
      setStatusBusy(false);
    }
  }

  if (loading) {
    return (
      <Shell title="Job opening">
        <p className="text-sm text-[#5B616B]">Loading job opening…</p>
      </Shell>
    );
  }

  if (error && !job) {
    return (
      <Shell title="Job opening">
        <p className="text-sm text-destructive">{error || "Job not found"}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/employer")}
        >
          Back to dashboard
        </Button>
      </Shell>
    );
  }

  if (!job || !formValues) {
    return (
      <Shell title="Job opening">
        <p className="text-sm text-destructive">Job not found</p>
      </Shell>
    );
  }

  if (editing) {
    return (
      <Shell title={`Edit · ${job.title}`}>
        <JobOpeningForm
          jobId={job.id}
          initialValues={formValues}
          founderEligible={founderEligible}
          onSaved={() => {
            setEditing(false);
            void load();
          }}
        />
      </Shell>
    );
  }

  const isHired = job.status === "hired";
  const isClosed = job.status === "closed";
  const matchingStopped = isHired || isClosed;

  return (
    <Shell title={job.title}>
      <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-[#5B616B]">
              {formatJobLocationLine(job)}
            </p>
            <p className="mt-2 text-lg font-semibold text-[#2B5B84]">
              {job.minSalary != null
                ? `$${job.minSalary.toLocaleString()}+`
                : "Salary TBD"}
            </p>
          </div>
          <Badge
            variant={job.status === "active" ? "default" : "secondary"}
            className={
              isHired ? "bg-[#E87A5D]/15 text-[#E87A5D]" : undefined
            }
          >
            {jobOpeningStatusLabel(job.status)}
          </Badge>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            className="h-10 bg-[#2B5B84] text-white hover:bg-[#244d70]"
            onClick={() => setEditing(true)}
          >
            Edit job opening
          </Button>
          {job.status !== "active" && !isHired && (
            <Button
              type="button"
              variant="outline"
              disabled={statusBusy}
              className="h-10 border-[#2B5B84]/25 text-[#2B5B84]"
              onClick={() => void updateStatus("active")}
            >
              Set Active
            </Button>
          )}
          {job.status === "active" && (
            <Button
              type="button"
              variant="outline"
              disabled={statusBusy}
              className="h-10 border-[#2B5B84]/25 text-[#2B5B84]"
              onClick={() => void updateStatus("paused")}
            >
              Pause
            </Button>
          )}
          {!isHired && (
            <Button
              type="button"
              disabled={statusBusy}
              className="h-10 bg-[#E87A5D] text-white hover:bg-[#d96b4f]"
              onClick={() => void updateStatus("hired")}
            >
              {statusBusy ? "Updating…" : "Mark as Hired"}
            </Button>
          )}
          {!isClosed && !isHired && (
            <Button
              type="button"
              variant="outline"
              disabled={statusBusy}
              className="h-10 border-[#5B616B]/30 text-[#5B616B]"
              onClick={() => void updateStatus("closed")}
            >
              Close opening
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-10 border-[#2B5B84]/25 text-[#2B5B84]"
            onClick={() => router.push("/dashboard/employer")}
          >
            Back to dashboard
          </Button>
        </div>

        {statusMessage && (
          <p className="mt-4 text-sm text-[#2B5B84]">{statusMessage}</p>
        )}
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <p className="mt-6 text-sm text-[#5B616B]">
          {matchingStopped
            ? isHired
              ? "This opening is marked Hired. MatchLever will not assign new candidates here."
              : "This opening is closed. Matching is stopped."
            : "Edit the role details anytime. When you fill the seat, mark the opening Hired to stop matching. Employers Accept or Pass each match from email; charge and hire-completion tracking come later."}
        </p>
      </section>
    </Shell>
  );
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100svh] bg-[#F7F6F3] text-[#2A2D34]">
      <header className="border-b border-[#2B5B84]/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/dashboard/employer" className="flex items-center gap-2">
            <BrandMark className="h-10 w-auto" />
            <span className="font-display text-xs font-bold tracking-[0.16em] uppercase">
              Employer Portal
            </span>
          </Link>
          <p className="truncate text-sm font-medium text-[#5B616B]">{title}</p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
