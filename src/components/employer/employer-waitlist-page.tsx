"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";

import { setStaySignedInPreference } from "@/lib/auth/stay-signed-in";
import {
  COMPANY_SIZES,
  EMPLOYER_USER_ROLES,
  HIRING_DEPARTMENTS,
  WORK_ARRANGEMENTS,
  employerWaitlistSchema,
  type EmployerWaitlistValues,
} from "@/lib/employer/waitlist-schema";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { StreamlineHiringSection } from "@/components/landing/employer-soft-launch";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Prefill = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  jobTitle: string | null;
  linkedinUrl: string | null;
  companyName: string | null;
};

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function EmployerWaitlistPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<EmployerWaitlistValues>({
    resolver: zodResolver(employerWaitlistSchema),
    defaultValues: {
      userRole: "recruiter",
      companyWebsite: "",
      industry: "",
      companySize: "11-50",
      estimatedRoles: 1,
      hiringDepartments: [],
      workArrangement: "hybrid",
      firstMatchFreeClaimed: true,
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employer/waitlist");
      const json = await res.json();
      setAuthenticated(Boolean(json.authenticated));
      setPrefill(json.prefill ?? null);
      if (json.submitted) {
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function connectLinkedIn() {
    setOauthError(null);
    if (!isSupabaseConfigured()) {
      setAuthenticated(true);
      setPrefill({
        firstName: "Jordan",
        lastName: "Lee",
        email: "jordan.employer@acme.io",
        jobTitle: "Head of Talent",
        linkedinUrl: "https://www.linkedin.com/in/jordan-lee",
        companyName: "Acme Systems",
      });
      return;
    }

    try {
      setStaySignedInPreference(true);
      const supabase = createClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", "/employer/waitlist");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "linkedin_oidc",
        options: { redirectTo: redirectTo.toString() },
      });

      if (error) {
        setOauthError(error.message);
        return;
      }
      if (data?.url) window.location.assign(data.url);
    } catch (err) {
      setOauthError(
        err instanceof Error ? err.message : "Unable to start LinkedIn sign-in."
      );
    }
  }

  async function onSubmit(values: EmployerWaitlistValues) {
    setSubmitError(null);
    const res = await fetch("/api/employer/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        firstMatchFreeClaimed: true,
        companyName: prefill?.companyName,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setSubmitError(json.error || "Unable to join waitlist");
      return;
    }
    setSubmitted(true);
    router.push("/dashboard/employer");
  }

  const departments = form.watch("hiringDepartments");

  return (
    <main className="bg-[#F7F6F3] text-[#2A2D34]">
      <StreamlineHiringSection showCta={false} />

      <section id="waitlist-form" className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <div className="mb-8 flex items-center gap-3">
          <BrandMark className="h-10 w-auto" />
          <div>
            <h1 className="font-display text-2xl font-semibold text-[#2B5B84]">
              Join the Employer Waitlist
            </h1>
            <p className="mt-1 text-sm text-[#5B616B]">
              Whether you are an in-house recruiter or a hiring manager, set up
              your profile to join the waitlist.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-[#5B616B]">Loading…</p>
        ) : submitted ? (
          <div className="rounded-lg border border-[#2B5B84]/15 bg-white p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 text-[#2B5B84]" />
              <div>
                <p className="font-display text-lg font-semibold text-[#2B5B84]">
                  You&apos;re on the employer waitlist
                </p>
                <p className="mt-2 text-sm text-[#5B616B]">
                  We&apos;ll email you when your account is activated for the
                  soft launch.
                </p>
                <Link
                  href="/dashboard/employer"
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-[#2B5B84] px-4 text-sm font-medium text-white hover:bg-[#244e71]"
                >
                  Go to employer dashboard
                </Link>
              </div>
            </div>
          </div>
        ) : !authenticated ? (
          <div className="rounded-lg border border-[#2B5B84]/15 bg-white p-6">
            <p className="text-sm text-[#5B616B]">
              Sign in with LinkedIn to verify your identity and pre-fill your
              employer profile.
            </p>
            <Button
              type="button"
              className="mt-4 h-11 w-full bg-[#0A66C2] text-white hover:bg-[#004182] sm:w-auto"
              onClick={() => void connectLinkedIn()}
            >
              <LinkedInIcon className="mr-2 size-4" />
              Continue with LinkedIn
            </Button>
            {oauthError && (
              <p className="mt-3 text-sm text-destructive">{oauthError}</p>
            )}
          </div>
        ) : (
          <form
            className="space-y-8 rounded-lg border border-[#2B5B84]/15 bg-white p-6"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div>
              <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
                Pre-filled from LinkedIn
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="First name" value={prefill?.firstName} />
                <Field label="Last name" value={prefill?.lastName} />
                <Field label="Email" value={prefill?.email} className="sm:col-span-2" />
                <Field label="Current job title" value={prefill?.jobTitle} />
                <Field label="Company name" value={prefill?.companyName} />
                <Field
                  label="LinkedIn profile URL"
                  value={prefill?.linkedinUrl}
                  className="sm:col-span-2"
                />
              </div>
            </div>

            <div className="space-y-4">
              <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
                Your role
              </p>
              <div className="grid gap-3">
                {EMPLOYER_USER_ROLES.map((role) => (
                  <label
                    key={role.value}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-[#2B5B84]/15 px-4 py-3"
                  >
                    <input
                      type="radio"
                      value={role.value}
                      {...form.register("userRole")}
                      className="accent-[#2B5B84]"
                    />
                    <span className="text-sm">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="companyWebsite">Company website</Label>
                <Input id="companyWebsite" {...form.register("companyWebsite")} />
                {form.formState.errors.companyWebsite && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.companyWebsite.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" {...form.register("industry")} />
              </div>
              <div className="space-y-2">
                <Label>Company size</Label>
                <Select
                  value={form.watch("companySize")}
                  onValueChange={(value) =>
                    form.setValue(
                      "companySize",
                      value as EmployerWaitlistValues["companySize"],
                      { shouldValidate: true }
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedRoles">Estimated active/upcoming roles</Label>
                <Input
                  id="estimatedRoles"
                  type="number"
                  min={1}
                  {...form.register("estimatedRoles", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Work arrangement</Label>
                <Select
                  value={form.watch("workArrangement")}
                  onValueChange={(value) =>
                    form.setValue(
                      "workArrangement",
                      value as EmployerWaitlistValues["workArrangement"],
                      { shouldValidate: true }
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select arrangement" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_ARRANGEMENTS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Primary departments hiring for</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {HIRING_DEPARTMENTS.map((dept) => {
                  const checked = departments.includes(dept);
                  return (
                    <label
                      key={dept}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        className="accent-[#2B5B84]"
                        onChange={(event) => {
                          const current = form.getValues("hiringDepartments");
                          form.setValue(
                            "hiringDepartments",
                            event.target.checked
                              ? [...current, dept]
                              : current.filter((d) => d !== dept),
                            { shouldValidate: true }
                          );
                        }}
                      />
                      {dept}
                    </label>
                  );
                })}
              </div>
              {form.formState.errors.hiringDepartments && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.hiringDepartments.message}
                </p>
              )}
            </div>

            <div className="flex items-start gap-3 rounded-md border border-[#E87A5D]/30 bg-[#E87A5D]/10 p-4">
              <input
                type="checkbox"
                checked
                disabled
                readOnly
                className="mt-0.5 accent-[#E87A5D]"
                aria-hidden
              />
              <span className="text-sm text-[#2A2D34]">
                <span className="font-semibold">First Match Free</span> — soft
                launch offer locked in for early-access employers.
              </span>
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <Button
              type="submit"
              className="h-11 w-full bg-[#E87A5D] text-white hover:bg-[#d66a4f] sm:w-auto"
            >
              Submit waitlist application
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}

function Field({
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
      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#5B616B] uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm text-[#2A2D34]">{value || "—"}</p>
    </div>
  );
}
