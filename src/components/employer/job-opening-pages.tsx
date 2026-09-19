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
        if (!res.ok) return;
        const json = await res.json();
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
  }, []);

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

  if (loading) {
    return (
      <Shell title="Job opening">
        <p className="text-sm text-[#5B616B]">Loading job opening…</p>
      </Shell>
    );
  }

  if (error || !job || !formValues) {
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
          <Button
            type="button"
            variant="outline"
            className="h-10 border-[#2B5B84]/25 text-[#2B5B84]"
            onClick={() => router.push("/dashboard/employer")}
          >
            Back to dashboard
          </Button>
        </div>

        <p className="mt-6 text-sm text-[#5B616B]">
          Candidate matches and Accept Match billing will appear here as the
          matching pipeline is connected. Accept Match charges $600 (or $0 with
          the 2026 founder promo) and unlocks contact details for up to 5
          accepts on this role.
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
            <BrandMark className="h-8 w-auto" />
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
