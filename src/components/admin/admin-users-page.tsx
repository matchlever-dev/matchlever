"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ADMIN_LINKS } from "@/lib/admin/admin-nav";
import {
  type AdminUserRow,
  userAccountTypeLabels,
  userMatchesAccountTypeFilter,
  userPrivilegeScore,
} from "@/lib/admin/demo";
import {
  AdminListControls,
  matchesKeyword,
  type AdminSortMode,
} from "@/components/admin/admin-list-controls";
import { PortalShell } from "@/components/admin/portal-shell";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const USER_STATUS_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "talent", label: "Talent" },
  { value: "employer", label: "Employer" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
  { value: "superuser", label: "Superuser" },
];

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sort, setSort] = useState<AdminSortMode>("recent");
  const [statusFilter, setStatusFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load users");
      setUsers(json.users ?? []);
      setDemo(Boolean(json.demo));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const list = users.filter((u) => {
      if (statusFilter === "admin" && !u.is_admin) return false;
      if (statusFilter === "superuser" && !u.is_superuser) return false;
      if (
        statusFilter !== "all" &&
        statusFilter !== "admin" &&
        statusFilter !== "superuser" &&
        !userMatchesAccountTypeFilter(u.role, statusFilter)
      ) {
        return false;
      }
      const types = userAccountTypeLabels(u.role);
      return matchesKeyword(keyword, [
        u.full_name,
        u.email,
        types.talent,
        types.employer,
      ]);
    });

    return [...list].sort((a, b) => {
      if (sort === "score") {
        const diff = userPrivilegeScore(b) - userPrivilegeScore(a);
        if (diff !== 0) return diff;
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [users, keyword, sort, statusFilter]);

  async function toggleFlag(
    user: AdminUserRow,
    field: "is_admin" | "is_superuser",
    value: boolean
  ) {
    const previous = users;
    const nextUsers = users.map((u) => {
      if (u.id !== user.id) return u;
      return { ...u, [field]: value };
    });
    setUsers(nextUsers);
    setBusyId(user.id);

    try {
      const body = { userId: user.id, [field]: value };

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
    } catch (err) {
      setUsers(previous);
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PortalShell title="Admin Portal" links={ADMIN_LINKS}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
            Access control
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#2B5B84]">
            Registered users
          </h1>
          <p className="mt-2 text-sm text-[#5B616B]">
            Toggle Admin and Superuser independently — a user can be either,
            both, or neither.
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
        statusOptions={USER_STATUS_OPTIONS}
        keyword={keyword}
        onKeywordChange={setKeyword}
        keywordPlaceholder="Search name, email, type…"
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden border border-[#2B5B84]/15 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-[#5B616B]">Loading users…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Talent</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Superuser</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => {
                const types = userAccountTypeLabels(user.role);
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium text-[#2A2D34]">
                        {user.full_name || "Unnamed"}
                      </div>
                      <div className="text-xs text-[#5B616B]">{user.email}</div>
                    </TableCell>
                    <TableCell className="text-[#2A2D34]">
                      {types.talent ?? ""}
                    </TableCell>
                    <TableCell className="text-[#2A2D34]">
                      {types.employer ?? ""}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.is_admin}
                        disabled={busyId === user.id}
                        onCheckedChange={(checked) =>
                          void toggleFlag(user, "is_admin", checked)
                        }
                        aria-label={`Toggle admin for ${user.email}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.is_superuser}
                        disabled={busyId === user.id}
                        onCheckedChange={(checked) =>
                          void toggleFlag(user, "is_superuser", checked)
                        }
                        aria-label={`Toggle superuser for ${user.email}`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-[#5B616B]">
                    {users.length === 0
                      ? "No users yet."
                      : "No users match these filters."}
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
