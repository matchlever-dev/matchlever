"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DEMO_EMPLOYER_DASHBOARD,
  employerCompanySizeLabel,
  employerStatusDescription,
  employerStatusHeadline,
  employerStatusLabel,
  employerUserRoleLabel,
  employerWorkArrangementLabel,
  type EmployerDashboardData,
} from "@/lib/dashboard/employer";
import { RoleSwitcher } from "@/components/auth/role-switcher";
import { BrandMark } from "@/components/brand/brand-mark";
import { ReferrerLinkedInLink } from "@/components/reference/referrer-linkedin-link";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureAbsoluteHttpUrl } from "@/lib/url";

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
    return <Badge variant={variant}>{employerStatusLabel(status)}</Badge>;
  }, [data?.profile.status]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F6F3] px-5 py-10">
        <p className="text-sm text-[#5B616B]">Loading employer profile…</p>
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

  const websiteHref = data.profile.companyWebsite
    ? ensureAbsoluteHttpUrl(data.profile.companyWebsite) ||
      data.profile.companyWebsite
    : null;

  return (
    <div className="flex min-h-[100svh] flex-col bg-[#F7F6F3] text-[#2A2D34]">
      <header className="border-b border-[#2B5B84]/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-8 w-auto" />
            <span className="font-display text-xs font-bold tracking-[0.16em] uppercase">
              Employer Profile
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

      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
                  Company
                </p>
                <h1 className="mt-2 font-display text-2xl font-semibold text-[#2B5B84]">
                  {data.profile.companyName}
                </h1>
                <p className="mt-1 text-sm text-[#5B616B]">
                  {data.profile.title || "Title not set"}
                </p>
              </div>
              {statusBadge}
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoField
                label="Your role"
                value={employerUserRoleLabel(data.profile.userRole)}
              />
              <InfoField
                label="Industry"
                value={data.profile.industry || "—"}
              />
              <InfoField
                label="Company size"
                value={employerCompanySizeLabel(data.profile.companySize)}
              />
              <InfoField
                label="Company website"
                value={
                  websiteHref ? (
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-[#2B5B84] underline-offset-2 hover:underline"
                    >
                      {data.profile.companyWebsite}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>
          </section>

          <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
            <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
              Account status
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold text-[#2B5B84]">
              {employerStatusHeadline(data.profile.status)}
            </h2>
            <p className="mt-2 max-w-lg text-sm text-[#5B616B]">
              {employerStatusDescription(data.profile.status)}
            </p>
            {data.profile.firstMatchFreeClaimed &&
            data.profile.status === "waitlisted" ? (
              <div className="mt-5 rounded-md border border-[#E87A5D]/30 bg-[#E87A5D]/10 px-4 py-3 text-sm">
                Your <span className="font-semibold">First Match Free</span> soft
                launch offer is locked in.
              </div>
            ) : null}
            {error ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </section>

          {data.profile.status === "active" ? (
            <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
              <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
                Hiring tools
              </p>
              <h2 className="mt-2 font-display text-xl font-semibold text-[#2B5B84]">
                Job posting coming next
              </h2>
              <p className="mt-2 text-sm text-[#5B616B]">
                Active employers will post roles, review incognito talent
                matches, and accept high-confidence introductions here in a
                future release.
              </p>
            </section>
          ) : null}
        </div>

        <div className="space-y-6">
          <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
            <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
              Hiring plan
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold text-[#2B5B84]">
              Soft launch intake
            </h2>
            <dl className="mt-5 space-y-4">
              <InfoField
                label="Estimated open roles"
                value={
                  data.profile.estimatedRoles != null
                    ? String(data.profile.estimatedRoles)
                    : "—"
                }
              />
              <InfoField
                label="Work arrangement"
                value={employerWorkArrangementLabel(
                  data.profile.workArrangement
                )}
              />
              <InfoField
                label="Hiring departments"
                value={
                  data.profile.hiringDepartments.length > 0
                    ? data.profile.hiringDepartments.join(", ")
                    : "—"
                }
              />
            </dl>
          </section>

          <section className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6">
            <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
              Account
            </p>
            <dl className="mt-4 space-y-4">
              <InfoField
                label="Contact name"
                value={data.user.fullName || "—"}
              />
              <InfoField label="Email" value={data.user.email || "—"} />
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[#5B616B] uppercase">
                  LinkedIn
                </p>
                <div className="mt-2">
                  {data.user.linkedinUrl ? (
                    <ReferrerLinkedInLink
                      url={data.user.linkedinUrl}
                      className="block text-sm break-all"
                    />
                  ) : (
                    <p className="text-sm text-[#5B616B]">—</p>
                  )}
                </div>
              </div>
            </dl>

            {!data.user.hasTalentProfile ? (
              <div className="mt-5 rounded-md border border-[#2B5B84]/12 bg-[#F7F6F3] p-4">
                <p className="font-display text-[11px] font-semibold tracking-[0.18em] text-[#2B5B84] uppercase">
                  Talent profile
                </p>
                <p className="mt-2 text-sm text-[#5B616B]">
                  Looking for opportunities too? Create a talent profile to join
                  MatchLever as a candidate.
                </p>
                <Link
                  href="/onboarding"
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-md border border-[#2B5B84]/25 px-4 text-sm font-medium text-[#2B5B84]"
                >
                  Start talent onboarding
                </Link>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-[0.14em] text-[#5B616B] uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm text-[#2A2D34]">{value}</dd>
    </div>
  );
}
