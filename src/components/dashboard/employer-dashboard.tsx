"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DEMO_EMPLOYER_DASHBOARD,
  employerStatusDescription,
  employerStatusHeadline,
  type EmployerDashboardData,
} from "@/lib/dashboard/employer";
import { employerStatusLabel } from "@/lib/employer/waitlist-schema";
import { RoleSwitcher } from "@/components/auth/role-switcher";
import { BrandMark } from "@/components/brand/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function EmployerDashboard() {
  const router = useRouter();
  const [data, setData] = useState<EmployerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const statusBadge = useMemo(() => {
    const status = data?.profile.status ?? "waitlisted";
    const variant =
      status === "active"
        ? "default"
        : status === "waitlisted"
          ? "secondary"
          : "outline";
    return (
      <Badge variant={variant}>{employerStatusLabel(status)}</Badge>
    );
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
        <p className="text-sm text-destructive">{error || "Unable to load dashboard"}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F6F3] text-[#2A2D34]">
      <header className="border-b border-[#2B5B84]/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <BrandMark className="h-8 w-auto" />
            <div>
              <p className="font-display text-sm font-semibold text-[#2B5B84]">
                Employer Dashboard
              </p>
              <p className="text-xs text-[#5B616B]">{data.profile.companyName}</p>
            </div>
          </div>
          <RoleSwitcher current="employer" />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold text-[#2B5B84]">
            {employerStatusHeadline(data.profile.status)}
          </h1>
          {statusBadge}
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5B616B] sm:text-base">
          {employerStatusDescription(data.profile.status)}
        </p>

        {data.profile.firstMatchFreeClaimed && data.profile.status === "waitlisted" && (
          <div className="mt-6 rounded-md border border-[#E87A5D]/30 bg-[#E87A5D]/10 px-4 py-3 text-sm">
            Your <span className="font-semibold">First Match Free</span> soft
            launch offer is locked in.
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <InfoCard label="Contact" value={data.user.fullName || data.user.email} />
          <InfoCard label="Title" value={data.profile.title} />
          <InfoCard label="Industry" value={data.profile.industry} />
          <InfoCard label="Company size" value={data.profile.companySize} />
          <InfoCard
            label="Hiring departments"
            value={data.profile.hiringDepartments.join(", ") || null}
            className="sm:col-span-2"
          />
        </section>

        {data.profile.status === "active" ? (
          <div className="mt-8 rounded-lg border border-[#2B5B84]/15 bg-white p-6">
            <p className="font-display text-sm font-semibold text-[#2B5B84]">
              Job posting tools coming next
            </p>
            <p className="mt-2 text-sm text-[#5B616B]">
              Active employers will post roles and accept incognito matches here
              during the next release phase.
            </p>
          </div>
        ) : (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-md border border-[#2B5B84]/25 px-4 text-sm font-medium text-[#2B5B84]"
            >
              Back to homepage
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={`border border-[#2B5B84]/12 bg-white p-4 ${className ?? ""}`}>
      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#5B616B] uppercase">
        {label}
      </p>
      <p className="mt-2 text-sm">{value || "—"}</p>
    </div>
  );
}
