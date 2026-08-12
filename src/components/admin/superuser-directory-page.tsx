"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { DirectoryPerson } from "@/lib/admin/demo";
import {
  AdminListControls,
  type AdminSortMode,
} from "@/components/admin/admin-list-controls";
import { PortalShell } from "@/components/admin/portal-shell";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SUPER_LINKS = [
  { href: "/superuser/directory", label: "Directory" },
  { href: "/superuser/manual-match", label: "Manual Match" },
];

const DIRECTORY_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "seeker", label: "Candidate" },
  { value: "hirer", label: "Hirer" },
  { value: "actively_looking", label: "Actively looking" },
  { value: "on_hold", label: "On Hold" },
  { value: "active", label: "Hirer active" },
];

export function SuperuserDirectoryPage() {
  const [people, setPeople] = useState<DirectoryPerson[]>([]);
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<AdminSortMode>("recent");
  const [statusFilter, setStatusFilter] = useState("all");
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/superuser/directory");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load directory");
      setPeople(json.people ?? []);
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
    const list = people.filter((p) => {
      if (statusFilter === "seeker" && p.kind !== "seeker") return false;
      if (statusFilter === "hirer" && p.kind !== "hirer") return false;
      if (
        statusFilter !== "all" &&
        statusFilter !== "seeker" &&
        statusFilter !== "hirer" &&
        p.status !== statusFilter
      ) {
        return false;
      }

      const q = keyword.trim().toLowerCase();
      if (!q) return true;
      const hay = [
        p.email,
        p.full_name,
        p.title,
        p.company,
        p.location,
        p.kind,
        p.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    return [...list].sort((a, b) => {
      if (sort === "score") {
        const sa = a.avg_authenticity_score ?? -1;
        const sb = b.avg_authenticity_score ?? -1;
        if (sb !== sa) return sb - sa;
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [people, keyword, sort, statusFilter]);

  return (
    <PortalShell title="Superuser Portal" links={SUPER_LINKS} accent="superuser">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
            Platform directory
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#2B5B84]">
            All Candidates & Hirers
          </h1>
          <p className="mt-2 text-sm text-[#5B616B]">
            Read-only searchable view across the entire exchange.
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
        statusOptions={DIRECTORY_STATUS_OPTIONS}
        keyword={keyword}
        onKeywordChange={setKeyword}
        keywordPlaceholder="Search name, email, company, location…"
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden border border-[#2B5B84]/15 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-[#5B616B]">Loading directory…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Title / Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((person) => (
                <TableRow key={`${person.kind}-${person.id}`}>
                  <TableCell>
                    <Badge
                      variant={
                        person.kind === "seeker" ? "default" : "secondary"
                      }
                      className="capitalize"
                    >
                      {person.kind === "seeker" ? "Candidate" : person.kind}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {person.full_name || "Unnamed"}
                    </div>
                    <div className="text-xs text-[#5B616B]">{person.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{person.title || "—"}</div>
                    <div className="text-xs text-[#5B616B]">
                      {person.company || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {person.location || "—"}
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {person.status?.replaceAll("_", " ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {person.avg_authenticity_score ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-[#5B616B]">
                    {people.length === 0
                      ? "No people in the directory yet."
                      : "No matches."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </PortalShell>
  );
}
