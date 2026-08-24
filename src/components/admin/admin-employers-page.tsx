"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AdminEmployerRow } from "@/lib/admin/demo";
import { employerStatusLabel } from "@/lib/employer/waitlist-schema";
import {
  AdminListControls,
  matchesKeyword,
  type AdminSortMode,
} from "@/components/admin/admin-list-controls";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
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
  { value: "waitlisted", label: "Waitlisted" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "inactive", label: "Inactive" },
];

const STATUS_VALUES = ["waitlisted", "active", "on_hold", "inactive"] as const;

function roleLabel(role: string | null) {
  if (role === "recruiter") return "Recruiter / TA";
  if (role === "hiring_manager") return "Hiring Manager";
  return role || "—";
}

export function AdminEmployersPage() {
  const [employers, setEmployers] = useState<AdminEmployerRow[]>([]);
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
        e.company_name,
        e.title,
        e.industry,
        e.company_website,
        e.user_role,
        e.status,
      ]);
    });

    return [...list].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [employers, keyword, sort, statusFilter]);

  const selected = filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

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
    if (!selected) return;
    if (!window.confirm(`Deactivate ${selected.company_name}?`)) return;
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

  return (
    <AdminPortalShell title="Employers">
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#2B5B84]">
            Employers
          </h1>
          <p className="mt-1 text-sm text-[#5B616B]">
            Manage employer waitlist, activation, and account status.
          </p>
        </div>

        <AdminListControls
          sort={sort}
          onSortChange={setSort}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={EMPLOYER_STATUS_OPTIONS}
          keyword={keyword}
          onKeywordChange={setKeyword}
          keywordPlaceholder="Search employers…"
        />

        {demo && (
          <p className="text-sm text-[#5B616B]">Demo mode — sample employer data.</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading ? (
          <p className="text-sm text-[#5B616B]">Loading employers…</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="max-h-[70vh] overflow-auto border border-[#2B5B84]/12 bg-white">
              {filtered.map((employer) => (
                <button
                  key={employer.id}
                  type="button"
                  onClick={() => setSelectedId(employer.id)}
                  className={`block w-full border-b border-[#2B5B84]/8 px-4 py-3 text-left transition hover:bg-[#F7F6F3] ${
                    selected?.id === employer.id ? "bg-[#F7F6F3]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{employer.company_name}</p>
                    <Badge variant="outline">
                      {employerStatusLabel(employer.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-[#5B616B]">
                    {employer.full_name || employer.email || "Unknown contact"}
                  </p>
                </button>
              ))}
              {!filtered.length && (
                <p className="p-4 text-sm text-[#5B616B]">No employers found.</p>
              )}
            </div>

            {selected ? (
              <div className="border border-[#2B5B84]/12 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-[#2B5B84]">
                      {selected.company_name}
                    </h2>
                    <p className="mt-1 text-sm text-[#5B616B]">
                      {selected.full_name} · {roleLabel(selected.user_role)}
                    </p>
                  </div>
                  <Badge>{employerStatusLabel(selected.status)}</Badge>
                </div>

                <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                  <Detail label="Email" value={selected.email} />
                  <Detail label="Title" value={selected.title} />
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
                  <Button
                    type="button"
                    variant="outline"
                    className="border-destructive/40 text-destructive"
                    disabled={busy}
                    onClick={() => void deleteEmployer()}
                  >
                    Delete employer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border border-[#2B5B84]/12 bg-white p-5 text-sm text-[#5B616B]">
                Select an employer to manage status.
              </div>
            )}
          </div>
        )}
      </div>
    </AdminPortalShell>
  );
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
