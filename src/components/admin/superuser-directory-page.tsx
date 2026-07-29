"use client";

import { useCallback, useEffect, useState } from "react";

import type { DirectoryPerson } from "@/lib/admin/demo";
import { PortalShell } from "@/components/admin/portal-shell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

export function SuperuserDirectoryPage() {
  const [people, setPeople] = useState<DirectoryPerson[]>([]);
  const [query, setQuery] = useState("");
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/superuser/directory?q=${encodeURIComponent(q)}`
      );
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
    const handle = window.setTimeout(() => void load(query), 200);
    return () => window.clearTimeout(handle);
  }, [query, load]);

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

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, email, company, location…"
        className="mb-4 h-11 max-w-lg bg-white"
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((person) => (
                <TableRow key={`${person.kind}-${person.id}`}>
                  <TableCell>
                    <Badge
                      variant={person.kind === "seeker" ? "default" : "secondary"}
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
                </TableRow>
              ))}
              {people.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-[#5B616B]">
                    No matches.
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
