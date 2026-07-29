"use client";

import { useCallback, useEffect, useState } from "react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTACT_STATUSES,
  type ContactRequestRow,
  type ContactStatus,
} from "@/lib/contact/schema";
import { cn } from "@/lib/utils";

const ADMIN_LINKS = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/candidates", label: "Candidates" },
  { href: "/admin/contact", label: "Contact" },
];

function statusBadgeClass(status: ContactStatus) {
  if (status === "New") return "bg-[#2B5B84]/12 text-[#2B5B84]";
  if (status === "Active") return "bg-[#E87A5D]/15 text-[#E87A5D]";
  return "bg-[#5B616B]/15 text-[#5B616B]";
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function AdminContactPage() {
  const [requests, setRequests] = useState<ContactRequestRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const selected = requests.find((r) => r.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/contact");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load requests");
      const list = (json.requests ?? []) as ContactRequestRow[];
      setRequests(list);
      setDemo(Boolean(json.demo));
      setSelectedId((prev) => {
        if (prev && list.some((r) => r.id === prev)) return prev;
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

  useEffect(() => {
    setNotesDraft(selected?.admin_notes ?? "");
    setSaveMessage(null);
  }, [selected?.id, selected?.admin_notes]);

  async function updateRequest(patch: {
    status?: ContactStatus;
    adminNotes?: string | null;
  }) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    const previous = requests;
    setRequests((rows) =>
      rows.map((row) => {
        if (row.id !== selected.id) return row;
        return {
          ...row,
          status: patch.status ?? row.status,
          admin_notes:
            patch.adminNotes !== undefined ? patch.adminNotes : row.admin_notes,
          updated_at: new Date().toISOString(),
        };
      })
    );

    try {
      const res = await fetch("/api/admin/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          status: patch.status,
          adminNotes: patch.adminNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      setSaveMessage("Saved");
    } catch (err) {
      setRequests(previous);
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PortalShell title="Admin Portal" links={ADMIN_LINKS}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
            Inbox
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#2B5B84]">
            Contact requests
          </h1>
          <p className="mt-2 text-sm text-[#5B616B]">
            Review submissions, update status, and keep internal notes.
          </p>
        </div>
        {demo && (
          <Badge variant="secondary" className="bg-[#E87A5D]/15 text-[#E87A5D]">
            Demo mode
          </Badge>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden border border-[#2B5B84]/15 bg-white">
          {loading ? (
            <p className="p-6 text-sm text-[#5B616B]">Loading requests…</p>
          ) : requests.length === 0 ? (
            <p className="p-6 text-sm text-[#5B616B]">No contact requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "cursor-pointer",
                      selectedId === row.id && "bg-[#2B5B84]/6"
                    )}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <TableCell>
                      <div className="font-medium text-[#2A2D34]">{row.email}</div>
                      <div className="line-clamp-1 text-xs text-[#5B616B]">
                        {row.message}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{row.topic}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusBadgeClass(row.status)}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-[#5B616B]">
                      {formatDate(row.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <aside className="border border-[#2B5B84]/15 bg-white p-5">
          {!selected ? (
            <p className="text-sm text-[#5B616B]">
              Select a request to view details.
            </p>
          ) : (
            <div className="grid gap-5">
              <div>
                <p className="font-display text-[11px] font-semibold tracking-[0.18em] text-[#E87A5D] uppercase">
                  Details
                </p>
                <h2 className="mt-2 font-display text-lg font-semibold text-[#2B5B84]">
                  {selected.topic}
                </h2>
                <p className="mt-1 text-sm text-[#5B616B]">{selected.email}</p>
                <p className="mt-1 text-xs text-[#5B616B]">
                  Received {formatDate(selected.created_at)}
                </p>
              </div>

              <div>
                <Label className="text-[#5B616B]">Message</Label>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#2A2D34]">
                  {selected.message}
                </p>
              </div>

              <div>
                <Label className="text-[#5B616B]">Attachment</Label>
                {selected.attachment_url || selected.attachment_download_url ? (
                  <p className="mt-2 text-sm">
                    {selected.attachment_download_url ? (
                      <a
                        href={selected.attachment_download_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#2B5B84] underline-offset-2 hover:underline"
                      >
                        View / download attachment
                      </a>
                    ) : (
                      <span className="text-[#5B616B]">
                        Stored at{" "}
                        <code className="text-xs">{selected.attachment_url}</code>
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-[#5B616B]">No attachment</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={selected.status}
                  onValueChange={(value) => {
                    if (!value) return;
                    void updateRequest({ status: value as ContactStatus });
                  }}
                  disabled={saving}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="admin-notes">Admin notes</Label>
                <Textarea
                  id="admin-notes"
                  rows={4}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Internal notes for the team…"
                  className="min-h-24 resize-y"
                  disabled={saving}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    disabled={saving}
                    className="bg-[#2B5B84] text-white hover:bg-[#244e70]"
                    onClick={() =>
                      void updateRequest({
                        adminNotes: notesDraft.trim() ? notesDraft : null,
                      })
                    }
                  >
                    {saving ? "Saving…" : "Save notes"}
                  </Button>
                  {saveMessage && (
                    <span className="text-xs text-[#2B5B84]">{saveMessage}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </PortalShell>
  );
}
