"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  DEMO_SEEKER_DASHBOARD,
  hasCompleteReferences,
  REQUIRED_VERIFIED_REFERENCES,
  type SeekerAvailability,
  type SeekerDashboardData,
} from "@/lib/dashboard/seeker";
import { BrandMark } from "@/components/brand/brand-mark";
import { AnonymousCandidateCard } from "@/components/dashboard/anonymous-candidate-card";
import { ReferenceStatusTracker } from "@/components/dashboard/reference-status-tracker";
import {
  DeleteAccountDialog,
  EditProfileModal,
} from "@/components/dashboard/seeker-modals";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function SeekerDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SeekerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [inviteWarning, setInviteWarning] = useState<string | null>(null);

  useEffect(() => {
    const warning = searchParams.get("warning");
    if (warning) setInviteWarning(warning);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNeedsOnboarding(false);
    try {
      const res = await fetch("/api/dashboard/seeker");
      const json = await res.json();
      if (res.status === 401) {
        router.replace("/login?next=/dashboard/seeker");
        return;
      }
      if (res.status === 404 && json.code === "PROFILE_MISSING") {
        setNeedsOnboarding(true);
        setData(null);
        setError(json.error || "Complete onboarding to open your dashboard.");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to load dashboard");
      setData(json as SeekerDashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      // Demo fixtures only when Supabase itself is not configured.
      if (!isSupabaseConfigured()) {
        setData(DEMO_SEEKER_DASHBOARD);
      } else {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus(nextChecked: boolean) {
    if (!data) return;
    const nextStatus: SeekerAvailability = nextChecked
      ? "actively_looking"
      : "on_hold";
    if (
      nextStatus === "actively_looking" &&
      !hasCompleteReferences(data.references)
    ) {
      setError(
        `Complete all ${REQUIRED_VERIFIED_REFERENCES} references before turning Actively Looking on.`
      );
      return;
    }
    const previous = data.status;
    setError(null);
    setData({ ...data, status: nextStatus });
    setStatusBusy(true);
    try {
      const res = await fetch("/api/dashboard/seeker", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        setData({ ...data, status: previous });
        throw new Error(json.error || "Unable to update status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status");
    } finally {
      setStatusBusy(false);
    }
  }

  async function signOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore when Supabase is unconfigured.
    }
    router.replace("/login");
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[60svh] items-center justify-center text-sm text-[#5B616B]">
        Loading dashboard…
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="flex min-h-[60svh] flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="max-w-md text-sm text-[#5B616B]">
          {error ||
            "Finish seeker onboarding to create your anonymous profile and invite references."}
        </p>
        <Link
          href="/onboarding"
          className="inline-flex h-11 items-center justify-center rounded-md bg-[#2B5B84] px-5 font-display text-xs font-semibold tracking-[0.14em] text-white uppercase"
        >
          Continue onboarding
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60svh] flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-sm text-destructive">
          {error || "Unable to load dashboard"}
        </p>
        <Link
          href="/login?next=/dashboard/seeker"
          className="text-sm font-medium text-[#2B5B84] underline underline-offset-2"
        >
          Log in again
        </Link>
      </div>
    );
  }

  const referencesComplete = hasCompleteReferences(data.references);
  const activelyLooking =
    data.status === "actively_looking" && referencesComplete;
  const canGoActive = referencesComplete;

  return (
    <div className="min-h-[100svh] bg-[#F7F6F3] text-[#2A2D34]">
      <header className="border-b border-[#2B5B84]/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-8 w-auto" />
            <span className="font-display text-xs font-bold tracking-[0.16em] uppercase">
              Seeker Dashboard
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/onboarding"
              className="text-xs font-medium text-[#2B5B84] hover:underline"
            >
              Update prefs
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-xs font-medium text-[#5B616B] hover:text-[#2B5B84] hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <AnonymousCandidateCard data={data} />

          <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
            <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
              Availability
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold text-[#2B5B84]">
              Status
            </h2>
            <p className="mt-2 max-w-lg text-sm text-[#5B616B]">
              {!canGoActive
                ? `Your profile stays hidden until all ${REQUIRED_VERIFIED_REFERENCES} references are verified — then you can turn Actively Looking on.`
                : activelyLooking
                  ? "Your anonymous card is visible to matched hirers."
                  : "Your profile is hidden from all searches until you turn looking back on."}
            </p>
            {error && (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-4 rounded-lg border border-[#2B5B84]/15 bg-[#F7F6F3] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`font-display text-sm font-semibold ${
                    !activelyLooking ? "text-[#E87A5D]" : "text-[#5B616B]"
                  }`}
                >
                  On Hold (Snoozed)
                </span>
                <Switch
                  checked={activelyLooking}
                  disabled={statusBusy || (!canGoActive && !activelyLooking)}
                  onCheckedChange={(checked) => void toggleStatus(checked)}
                  aria-label="Toggle on hold versus actively looking"
                  className="data-checked:bg-[#2B5B84] data-unchecked:bg-[#E87A5D]"
                />
                <span
                  className={`font-display text-sm font-semibold ${
                    activelyLooking ? "text-[#2B5B84]" : "text-[#5B616B]"
                  }`}
                >
                  Actively Looking
                </span>
              </div>
              {!activelyLooking && (
                <div className="inline-flex items-center self-start rounded-md bg-[#E87A5D] px-2.5 py-1 font-display text-[10px] font-bold tracking-[0.18em] text-white uppercase">
                  Hidden from searches
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {inviteWarning && (
            <div
              role="alert"
              className="border border-[#E87A5D]/40 bg-[#E87A5D]/10 px-4 py-3 text-sm text-[#2A2D34]"
            >
              {inviteWarning}
            </div>
          )}
          <ReferenceStatusTracker
            references={data.references}
            onChanged={() => void load()}
          />

          <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
            <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
              Account
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <Button
                type="button"
                className="h-11 bg-[#2B5B84] text-white hover:bg-[#244e71]"
                onClick={() => setEditOpen(true)}
              >
                Edit Profile
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 border-destructive/40 text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                Delete Account
              </Button>
            </div>
            {data.demo && (
              <p className="mt-4 text-xs text-[#5B616B]">
                Demo mode — connect Supabase auth to persist live profile changes.
              </p>
            )}
            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
          </section>
        </div>
      </main>

      <EditProfileModal
        open={editOpen}
        onOpenChange={setEditOpen}
        data={data}
        onSaved={(next) => {
          setData((prev) => (prev ? { ...prev, ...next } : prev));
          if (!data.demo) void load();
        }}
      />
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}
