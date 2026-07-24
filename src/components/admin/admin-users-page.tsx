"use client";

import { useCallback, useEffect, useState } from "react";

import type { AdminUserRow } from "@/lib/admin/demo";
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

const ADMIN_LINKS = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/candidates", label: "Candidates" },
];

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function toggleFlag(
    user: AdminUserRow,
    field: "is_admin" | "is_superuser",
    value: boolean
  ) {
    const previous = users;
    const nextUsers = users.map((u) => {
      if (u.id !== user.id) return u;
      if (field === "is_superuser") {
        return {
          ...u,
          is_superuser: value,
          is_admin: value ? true : u.is_admin,
        };
      }
      return { ...u, is_admin: value, is_superuser: value ? u.is_superuser : false };
    });
    setUsers(nextUsers);
    setBusyId(user.id);

    try {
      const body =
        field === "is_superuser"
          ? { userId: user.id, is_superuser: value, is_admin: value || user.is_admin }
          : {
              userId: user.id,
              is_admin: value,
              is_superuser: value ? user.is_superuser : false,
            };

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
            Toggle admin and superuser privileges in real time.
          </p>
        </div>
        {demo && (
          <Badge variant="secondary" className="bg-[#E87A5D]/15 text-[#E87A5D]">
            Demo mode
          </Badge>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden border border-[#2B5B84]/15 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-[#5B616B]">Loading users…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Superuser</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium text-[#2A2D34]">
                      {user.full_name || "Unnamed"}
                    </div>
                    <div className="text-xs text-[#5B616B]">{user.email}</div>
                  </TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </PortalShell>
  );
}
