"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_SITE_COPY,
  type SiteCopy,
} from "@/lib/marketing/site-copy";

export function AdminSiteCopyPage() {
  const [heroTaglines, setHeroTaglines] = useState<[string, string, string]>([
    ...DEFAULT_SITE_COPY.heroTaglines,
  ]);
  const [brandTagline, setBrandTagline] = useState(
    DEFAULT_SITE_COPY.brandTagline
  );
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/site-copy");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load site copy");

      const copy = json as SiteCopy & { demo?: boolean };
      const lines = copy.heroTaglines ?? DEFAULT_SITE_COPY.heroTaglines;
      setHeroTaglines([
        lines[0] ?? "",
        lines[1] ?? "",
        lines[2] ?? "",
      ]);
      setBrandTagline(copy.brandTagline || DEFAULT_SITE_COPY.brandTagline);
      setDemo(Boolean(copy.demo));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateHeroTagline(index: 0 | 1 | 2, value: string) {
    setHeroTaglines((current) => {
      const next: [string, string, string] = [...current];
      next[index] = value;
      return next;
    });
    setSaveMessage(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/admin/site-copy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heroTaglines: heroTaglines.map((line) => line.trim()),
          brandTagline: brandTagline.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");

      if (Array.isArray(json.heroTaglines) && json.heroTaglines.length === 3) {
        setHeroTaglines([
          String(json.heroTaglines[0]),
          String(json.heroTaglines[1]),
          String(json.heroTaglines[2]),
        ]);
      }
      if (typeof json.brandTagline === "string") {
        setBrandTagline(json.brandTagline);
      }
      setSaveMessage(json.demo ? "Saved (demo mode — not persisted)" : "Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPortalShell title="Site copy">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
            Marketing
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#2B5B84]">
            Homepage & brand taglines
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#5B616B]">
            Edit the three rotating homepage headlines and the brand tagline
            shown in the footer and elsewhere.
          </p>
        </div>
        {demo && (
          <Badge variant="secondary" className="bg-[#E87A5D]/15 text-[#E87A5D]">
            Demo mode
          </Badge>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-[#5B616B]">Loading site copy…</p>
      ) : (
        <form
          className="max-w-2xl border border-[#2B5B84]/15 bg-white p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-6">
            <section className="grid gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#2B5B84]">
                  Hero carousel
                </h2>
                <p className="mt-1 text-sm text-[#5B616B]">
                  These three lines rotate on the homepage hero.
                </p>
              </div>
              {([0, 1, 2] as const).map((index) => (
                <div key={index} className="grid gap-2">
                  <Label htmlFor={`hero-tagline-${index}`}>
                    Tagline {index + 1}
                  </Label>
                  <Input
                    id={`hero-tagline-${index}`}
                    value={heroTaglines[index]}
                    onChange={(e) => updateHeroTagline(index, e.target.value)}
                    maxLength={120}
                    required
                    disabled={saving}
                    className="h-10"
                  />
                </div>
              ))}
            </section>

            <div className="h-px bg-[#2B5B84]/10" />

            <section className="grid gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#2B5B84]">
                  Brand tagline
                </h2>
                <p className="mt-1 text-sm text-[#5B616B]">
                  Shown at the bottom of every page (and brand lockups that
                  include the tagline).
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brand-tagline">Tagline</Label>
                <Input
                  id="brand-tagline"
                  value={brandTagline}
                  onChange={(e) => {
                    setBrandTagline(e.target.value);
                    setSaveMessage(null);
                  }}
                  maxLength={200}
                  required
                  disabled={saving}
                  className="h-10"
                />
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#2B5B84] text-white hover:bg-[#244e70]"
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
              {saveMessage && (
                <span className="text-xs text-[#2B5B84]">{saveMessage}</span>
              )}
            </div>
          </div>
        </form>
      )}
    </AdminPortalShell>
  );
}
