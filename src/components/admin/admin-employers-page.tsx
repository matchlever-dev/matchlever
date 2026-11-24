"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ADMIN_LINKS } from "@/lib/admin/admin-nav";
import type { AdminEmployerRow } from "@/lib/admin/demo";
import { SUPERUSER_LINKS } from "@/lib/admin/superuser-nav";
import { resolvedCompanyName } from "@/lib/employer/company-name";
import { employerStatusLabel } from "@/lib/employer/intake-schema";
import {
  AdminListControls,
  matchesKeyword,
  type AdminListSortOption,
} from "@/components/admin/admin-list-controls";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { PortalShell } from "@/components/admin/portal-shell";
import { ReferrerLinkedInLink } from "@/components/reference/referrer-linkedin-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPLOYER_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "inactive", label: "Inactive" },
];

const STATUS_VALUES = ["active", "on_hold", "inactive"] as const;

type EmployersSortMode = "most_recent" | "company" | "name";

const SORT_OPTIONS: ReadonlyArray<AdminListSortOption<EmployersSortMode>> = [
  { value: "most_recent", label: "Most Recent" },
  { value: "company", label: "Company" },
  { value: "name", label: "Name" },
];

function roleLabel(role: string | null) {
  if (role === "recruiter") return "Recruiter / TA";
  if (role === "hiring_manager") return "Hiring Manager";
  return role || "—";
}

function employerCompanyTitle(employer: AdminEmployerRow): string {
  return resolvedCompanyName(employer.company_name) || "Company TBD";
}

function employerContactName(employer: AdminEmployerRow): string {
  return employer.full_name || employer.email || "Unknown contact";
}

export function AdminEmployersPage() {
  return (
    <EmployersListPage
      portalTitle="Admin Portal"
      links={ADMIN_LINKS}
      accent="admin"
      allowDelete
    />
  );
}

export function SuperuserEmployersPage() {
  return (
    <EmployersListPage
      portalTitle="Superuser Portal"
      links={SUPERUSER_LINKS}
      accent="superuser"
      allowDelete={false}
    />
  );
}

function EmployersListPage({
  portalTitle,
  links,
  accent,
  allowDelete,
}: {
  portalTitle: string;
  links: readonly { href: string; label: string }[];
  accent: "admin" | "superuser";
  allowDelete: boolean;
}) {
  const [employers, setEmployers] = useState<AdminEmployerRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<EmployersSortMode>("most_recent");
  const [statusFilter, setStatusFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/employers");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load employers");
      const list = (json.employers ?? []) as AdminEmployerRow[];
      setEmployers(list);
      setDemo(Boolean(json.demo));
      setSelectedId((prev) => {
        if (prev && list.some((e) => e.id === prev)) return prev;
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
    const list = employers.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      return matchesKeyword(keyword, [
        e.full_name,
        e.email,
        resolvedCompanyName(e.company_name),
        e.title,
        e.industry,
        e.company_website,
        e.user_role,
        e.status,
      ]);
    });

    return [...list].sort((a, b) => {
      if (sort === "company") {
        const companyA = employerCompanyTitle(a);
        const companyB = employerCompanyTitle(b);
        const byCompany = companyA.localeCompare(companyB, undefined, {
          sensitivity: "base",
        });
        if (byCompany !== 0) return byCompany;
        return employerContactName(a).localeCompare(
          employerContactName(b),
          undefined,
          { sensitivity: "base" }
        );
      }
      if (sort === "name") {
        const byName = employerContactName(a).localeCompare(
          employerContactName(b),
          undefined,
          { sensitivity: "base" }
        );
        if (byName !== 0) return byName;
        return employerCompanyTitle(a).localeCompare(
          employerCompanyTitle(b),
          undefined,
          { sensitivity: "base" }
        );
      }
      // Most Recent
      return b.updated_at.localeCompare(a.updated_at);
    });
  }, [employers, keyword, sort, statusFilter]);

  const selected =
    filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (filtered.length === 0) return;
    if (!filtered.some((e) => e.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  async function updateStatus(status: string) {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/employers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employerId: selected.id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to update status");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEmployer() {
    if (!allowDelete || !selected) return;
    const label = employerCompanyTitle(selected);
    if (!window.confirm(`Deactivate ${label}?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/employers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employerId: selected.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to delete employer");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete employer");
    } finally {
      setBusy(false);
    }
  }

  const pageContent = (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {accent === "superuser" ? (
            <>
              <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
                Concierge
              </p>
              <h1 className="mt-2 font-display text-2xl font-semibold text-[#2B5B84]">
                Employers
              </h1>
              <p className="mt-2 text-sm text-[#5B616B]">
                Manage employer accounts, activation, and account status.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold text-[#2B5B84]">
                Employers
              </h1>
              <p className="mt-1 text-sm text-[#5B616B]">
                Manage employer accounts, activation, and account status.
              </p>
            </>
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
        sortOptions={SORT_OPTIONS}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={EMPLOYER_STATUS_OPTIONS}
        keyword={keyword}
        onKeywordChange={setKeyword}
        keywordPlaceholder="Search employers…"
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {loading ? (
        <p className="text-sm text-[#5B616B]">Loading employers…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="max-h-[70vh] overflow-auto border border-[#2B5B84]/12 bg-white">
            {filtered.map((employer) => {
              const companyTitle = employerCompanyTitle(employer);
              return (
                <button
                  key={employer.id}
                  type="button"
                  onClick={() => setSelectedId(employer.id)}
                  className={`block w-full border-b border-[#2B5B84]/8 px-4 py-3 text-left transition hover:bg-[#F7F6F3] ${
                    selected?.id === employer.id ? "bg-[#F7F6F3]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{companyTitle}</p>
                    <Badge variant="outline">
                      {employerStatusLabel(employer.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-[#5B616B]">
                    {employerContactName(employer)}
                  </p>
                </button>
              );
            })}
            {!filtered.length && (
              <p className="p-4 text-sm text-[#5B616B]">No employers found.</p>
            )}
          </div>

          {selected ? (
            <div className="border border-[#2B5B84]/12 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-[#2B5B84]">
                    {employerCompanyTitle(selected)}
                  </h2>
                  <p className="mt-1 text-sm text-[#5B616B]">
                    {employerContactName(selected)} ·{" "}
                    {roleLabel(selected.user_role)}
                  </p>
                </div>
                <Badge>{employerStatusLabel(selected.status)}</Badge>
              </div>

              <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                <Detail label="Email" value={selected.email} />
                <Detail label="Title" value={selected.title} />
                <Detail
                  label="Company"
                  value={resolvedCompanyName(selected.company_name)}
                />
                <Detail label="Website" value={selected.company_website} />
                <Detail label="Industry" value={selected.industry} />
                <Detail label="Company size" value={selected.company_size} />
                <Detail
                  label="Estimated roles"
                  value={
                    selected.estimated_roles != null
                      ? String(selected.estimated_roles)
                      : null
                  }
                />
                <Detail
                  label="Departments"
                  value={selected.hiring_departments.join(", ") || null}
                  className="sm:col-span-2"
                />
                <Detail label="Work arrangement" value={selected.work_arrangement} />
                <Detail
                  label="First match free"
                  value={selected.first_match_free_claimed ? "Claimed" : "No"}
                />
              </dl>

              {selected.linkedin_url && (
                <div className="mt-4">
                  <ReferrerLinkedInLink url={selected.linkedin_url} />
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-end gap-3">
                <div className="min-w-[180px] space-y-2">
                  <p className="text-xs font-semibold tracking-wide text-[#5B616B] uppercase">
                    Status
                  </p>
                  <Select
                    value={selected.status}
                    onValueChange={(value) => {
                      if (value) void updateStatus(value);
                    }}
                    disabled={busy}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_VALUES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {employerStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {allowDelete && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-destructive/40 text-destructive"
                    disabled={busy}
                    onClick={() => void deleteEmployer()}
                  >
                    Delete employer
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-[#2B5B84]/12 bg-white p-5 text-sm text-[#5B616B]">
              Select an employer to manage status.
            </div>
          )}
        </div>
      )}
    </>
  );

  if (accent === "superuser") {
    return (
      <PortalShell title={portalTitle} links={links} accent="superuser">
        {pageContent}
      </PortalShell>
    );
  }

  return <AdminPortalShell title="Employers">{pageContent}</AdminPortalShell>;
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold tracking-[0.14em] text-[#5B616B] uppercase">
        {label}
      </dt>
      <dd className="mt-1">{value || "—"}</dd>
    </div>
  );
}
