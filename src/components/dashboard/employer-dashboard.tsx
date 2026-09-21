"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import {
  DEMO_EMPLOYER_DASHBOARD,
  formatJobLocationLine,
  formatSalary,
  jobOpeningStatusLabel,
  type EmployerDashboardData,
  type EmployerJobSummary,
} from "@/lib/dashboard/employer";
import { isFounderPromoEligible } from "@/lib/employer/billing";
import { RoleSwitcher } from "@/components/auth/role-switcher";
import { BrandMark } from "@/components/brand/brand-mark";
import { EmployerBillingPanel } from "@/components/employer/employer-billing-panel";
import { EditEmployerProfileFields } from "@/components/employer/job-opening-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function EmployerDashboard() {
  const router = useRouter();
  const [data, setData] = useState<EmployerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/employer");
      const json = await res.json();
      if (res.status === 401) {
        router.replace("/login?next=/dashboard/employer");
        return;
      }
      if (res.status === 404 && json.code === "PROFILE_MISSING") {
        router.replace("/employer/waitlist");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to load dashboard");
      setData(json as EmployerDashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      if (!isSupabaseConfigured()) {
        setData(DEMO_EMPLOYER_DASHBOARD);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function signOut() {
    if (!isSupabaseConfigured()) {
      router.push("/login");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const statusBadge = useMemo(() => {
    const status = data?.profile.status ?? "waitlisted";
    const variant =
      status === "active"
        ? "default"
        : status === "waitlisted"
          ? "secondary"
          : "outline";
    return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
  }, [data?.profile.status]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F6F3] px-5 py-10">
        <p className="text-sm text-[#5B616B]">Loading employer dashboard…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#F7F6F3] px-5 py-10">
        <p className="text-sm text-destructive">
          {error || "Unable to load employer profile"}
        </p>
      </main>
    );
  }

  const initials =
    data.user.fullName
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "EM";

  return (
    <div className="flex min-h-[100svh] flex-col bg-[#F7F6F3] text-[#2A2D34]">
      <header className="border-b border-[#2B5B84]/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-10 w-auto" />
            <span className="font-display text-xs font-bold tracking-[0.16em] uppercase">
              Employer Portal
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <RoleSwitcher current="employer" />
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8">
        {toast ? (
          <div
            className="mb-4 rounded-md border border-[#2B5B84]/20 bg-[#2B5B84] px-4 py-3 text-sm text-white"
            role="status"
          >
            {toast}
          </div>
        ) : null}

        {error ? (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {data.user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.user.avatarUrl}
                  alt=""
                  className="size-16 rounded-full border border-[#2B5B84]/15 object-cover"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full bg-[#2B5B84] font-display text-lg font-semibold text-white">
                  {initials}
                </div>
              )}
              <div>
                <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
                  Profile
                </p>
                <h1 className="mt-1 font-display text-2xl font-semibold text-[#2B5B84]">
                  {data.user.fullName || "Employer"}
                </h1>
                <p className="mt-1 text-sm text-[#5B616B]">
                  {employerProfileSubtitle(data.profile)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {statusBadge}
              <Button
                type="button"
                variant="outline"
                className="h-10 border-[#2B5B84]/25 text-[#2B5B84]"
                onClick={() => setEditOpen(true)}
              >
                Edit Profile
              </Button>
            </div>
          </div>
          {isFounderPromoEligible(data.billing) ? (
            <p className="mt-4 rounded-md border border-[#E87A5D]/25 bg-[#E87A5D]/10 px-3 py-2 text-sm text-[#2A2D34]">
              2026 Founder Special active — your first accepted match is $0.
            </p>
          ) : null}
        </section>

        <Tabs defaultValue="jobs" className="mt-6">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-[#F7F6F3] p-1">
            <TabsTrigger value="jobs">Job openings</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#2B5B84]">
                  Active job openings
                </h2>
                <p className="mt-1 text-sm text-[#5B616B]">
                  Draft and publish roles that mirror talent preference fields.
                </p>
              </div>
              {data.profile.status === "active" ? (
                <Button
                  type="button"
                  className="h-11 bg-[#2B5B84] text-white hover:bg-[#244d70]"
                  onClick={() => router.push("/dashboard/employer/jobs/new")}
                >
                  <Plus className="size-4" data-icon="inline-start" />
                  Add New Job Opening
                </Button>
              ) : null}
            </div>

            {data.profile.status !== "active" ? (
              <div className="border border-[#2B5B84]/15 bg-white px-5 py-8 text-sm text-[#5B616B]">
                Job posting unlocks when your employer account is activated.
                You can still manage Billing while waitlisted.
              </div>
            ) : data.jobs.length === 0 ? (
              <div className="border border-dashed border-[#2B5B84]/20 bg-white px-5 py-10 text-center">
                <p className="text-sm text-[#5B616B]">
                  No job openings yet. Posting is free — you only pay when you
                  accept a match.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {data.jobs.map((job) => (
                  <JobOpeningRow key={job.id} job={job} />
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="billing" className="mt-5">
            <EmployerBillingPanel
              billing={data.billing}
              onSaved={(next) =>
                setData((prev) =>
                  prev
                    ? {
                        ...prev,
                        billing: { ...prev.billing, ...next },
                      }
                    : prev
                )
              }
            />
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#2B5B84]">Edit profile</DialogTitle>
          </DialogHeader>
          <EditEmployerProfileFields
            title={data.profile.title || ""}
            companyName={data.profile.companyName}
            onSave={async (values) => {
              const res = await fetch("/api/dashboard/employer", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
              });
              const json = await res.json();
              if (!res.ok) {
                throw new Error(json.error || "Unable to update profile");
              }
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      profile: {
                        ...prev.profile,
                        title: values.title,
                        companyName: values.companyName,
                      },
                    }
                  : prev
              );
              setEditOpen(false);
              setToast("Profile updated.");
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobOpeningRow({ job }: { job: EmployerJobSummary }) {
  const statusVariant =
    job.status === "active"
      ? "default"
      : job.status === "draft"
        ? "secondary"
        : "outline";

  return (
    <li>
      <Link
        href={`/dashboard/employer/jobs/${job.id}`}
        className="block border border-[#2B5B84]/15 bg-white px-4 py-4 transition hover:border-[#2B5B84]/40 hover:bg-[#2B5B84]/[0.02] sm:px-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-base font-bold text-[#2A2D34]">
              {job.title}
            </p>
            <p className="mt-1 text-sm text-[#5B616B]">
              {formatJobLocationLine(job)}
            </p>
            <p className="mt-1 text-sm font-medium text-[#2B5B84]">
              {formatSalary(job.minSalary)}
            </p>
          </div>
          <Badge variant={statusVariant}>
            {jobOpeningStatusLabel(job.status)}
          </Badge>
        </div>
      </Link>
    </li>
  );
}

function employerProfileSubtitle(profile: {
  title: string | null;
  companyName: string;
}): string {
  const title = profile.title?.trim() || "";
  const company = profile.companyName?.trim() || "";
  const companyPending =
    !company || /^pending intake$/i.test(company);

  if (!title || companyPending) {
    return "Edit Profile to enter company name and title";
  }

  return `${title} · ${company}`;
}
