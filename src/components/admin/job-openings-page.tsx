"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { AdminJobOpeningRow } from "@/lib/admin/demo";
import {
  formatJobLocationLine,
  jobOpeningStatusLabel,
} from "@/lib/employer/job-opening-schema";
import {
  AdminListControls,
  matchesKeyword,
  type AdminSortMode,
} from "@/components/admin/admin-list-controls";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { PortalShell } from "@/components/admin/portal-shell";
import { Badge } from "@/components/ui/badge";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
  { value: "hired", label: "Hired" },
  { value: "closed", label: "Closed" },
];

export function AdminJobOpeningsPage() {
  return (
    <JobOpeningsListPage
      portal="admin"
      detailBase="/admin/job-openings"
    />
  );
}

export function SuperuserJobOpeningsPage({
  links,
}: {
  links: readonly { href: string; label: string }[];
}) {
  return (
    <JobOpeningsListPage
      portal="superuser"
      links={links}
      detailBase="/superuser/job-openings"
    />
  );
}

function JobOpeningsListPage({
  portal,
  links,
  detailBase,
}: {
  portal: "admin" | "superuser";
  links?: readonly { href: string; label: string }[];
  detailBase: string;
}) {
  const [jobs, setJobs] = useState<AdminJobOpeningRow[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<AdminSortMode>("recent");
  const [statusFilter, setStatusFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/job-openings");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load job openings");
      setJobs((json.jobs ?? []) as AdminJobOpeningRow[]);
      setDemo(Boolean(json.demo));
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
    const list = jobs.filter((job) => {
      if (statusFilter !== "all" && job.status !== statusFilter) return false;
      return matchesKeyword(keyword, [
        job.title,
        job.company_name,
        job.employer_name,
        job.employer_email,
        job.global_city,
      ]);
    });
    return [...list].sort((a, b) => {
      if (sort === "score") {
        // Higher match volume first when "Score" is selected.
        const delta = b.match_count - a.match_count;
        if (delta !== 0) return delta;
        return a.title.localeCompare(b.title);
      }
      return b.updated_at.localeCompare(a.updated_at);
    });
  }, [jobs, keyword, sort, statusFilter]);

  const body = (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {portal === "superuser" ? (
            <>
              <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
                Concierge
              </p>
              <h1 className="mt-2 font-display text-2xl font-semibold text-[#2B5B84]">
                Job openings
              </h1>
            </>
          ) : (
            <p className="text-sm text-[#5B616B]">
              Review openings, matched candidates, and free vs invoiced marks.
            </p>
          )}
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
        statusOptions={STATUS_OPTIONS}
        keyword={keyword}
        onKeywordChange={setKeyword}
        keywordPlaceholder="Search title, company, employer…"
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-[#5B616B]">Loading job openings…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[#5B616B]">No job openings found.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((job) => (
            <Link
              key={job.id}
              href={`${detailBase}/${job.id}`}
              className="block border border-[#2B5B84]/15 bg-white p-4 transition-colors hover:border-[#2B5B84]/35 hover:bg-[#2B5B84]/[0.03] sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-semibold text-[#2A2D34]">
                    {job.title}
                  </h2>
                  <p className="mt-1 text-sm text-[#5B616B]">
                    {job.company_name || "Company TBD"}
                    {job.employer_name ? ` · ${job.employer_name}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-[#5B616B]">
                    {formatJobLocationLine({
                      locationModes: job.location_modes,
                      globalCity: job.global_city,
                    })}
                    {job.min_salary
                      ? ` · $${job.min_salary.toLocaleString("en-US")}+`
                      : ""}
                  </p>
                </div>
                <Badge variant="secondary">
                  {jobOpeningStatusLabel(job.status)}
                </Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#5B616B]">
                <span>
                  Matches:{" "}
                  <strong className="text-[#2A2D34]">{job.match_count}</strong>
                </span>
                <span>
                  Accepted:{" "}
                  <strong className="text-[#2A2D34]">
                    {job.accepted_count}
                  </strong>
                </span>
                <span>
                  Passed:{" "}
                  <strong className="text-[#2A2D34]">
                    {job.passed_count}
                  </strong>
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
            </Link>
          ))}
        </div>
      )}
    </>
  );

  if (portal === "admin") {
    return <AdminPortalShell title="Job openings">{body}</AdminPortalShell>;
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
