"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  formatTimezoneOffset,
  type SeekerDashboardData,
} from "@/lib/dashboard/seeker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const editSchema = z.object({
  headline: z.string().trim().min(2).max(120),
  selectedTagline: z.string().trim().min(8).max(200),
  globalCity: z.string().trim().min(1).max(80),
  globalCountry: z.string().trim().min(1).max(80),
  timezoneOffset: z.string(),
  verifiedSkills: z.string(),
});

type EditValues = z.infer<typeof editSchema>;

export function EditProfileModal({
  open,
  onOpenChange,
  data,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SeekerDashboardData;
  onSaved: (next: Partial<SeekerDashboardData>) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: toFormValues(data),
  });

  useEffect(() => {
    if (open) reset(toFormValues(data));
  }, [open, data, reset]);

  async function onSubmit(values: EditValues) {
    setError(null);
    const timezoneOffset =
      values.timezoneOffset.trim() === ""
        ? null
        : Number.parseInt(values.timezoneOffset, 10);
    const offset =
      timezoneOffset !== null && Number.isFinite(timezoneOffset)
        ? timezoneOffset
        : null;
    const verifiedSkills = values.verifiedSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch("/api/dashboard/seeker/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: values.headline,
        selectedTagline: values.selectedTagline,
        globalCity: values.globalCity,
        globalCountry: values.globalCountry,
        timezoneOffset: offset,
        verifiedSkills,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Unable to save profile");
      return;
    }
    onOpenChange(false);
    onSaved({
      headline: values.headline,
      selectedTagline: values.selectedTagline,
      globalCity: values.globalCity,
      globalCountry: values.globalCountry,
      timezoneOffset: offset,
      timezoneLabel: formatTimezoneOffset(offset),
      verifiedSkills,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#2B5B84]">Edit profile</DialogTitle>
          <DialogDescription>
            Update the anonymous employer-facing card details.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <Field label="Headline" id="headline">
            <Input id="headline" {...register("headline")} />
          </Field>
          <Field label="Selected tagline" id="selectedTagline">
            <Textarea id="selectedTagline" rows={3} {...register("selectedTagline")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Closest city" id="globalCity">
              <Input id="globalCity" {...register("globalCity")} />
            </Field>
            <Field label="Country" id="globalCountry">
              <Input id="globalCountry" {...register("globalCountry")} />
            </Field>
          </div>
          <Field label="Timezone offset (minutes from UTC)" id="timezoneOffset">
            <Input
              id="timezoneOffset"
              placeholder="-300"
              {...register("timezoneOffset")}
            />
          </Field>
          <Field label="Verified skills (comma-separated)" id="verifiedSkills">
            <Input
              id="verifiedSkills"
              placeholder="TypeScript, PostgreSQL"
              {...register("verifiedSkills")}
            />
          </Field>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter className="mx-0 mb-0 border-0 bg-transparent p-0">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#2B5B84] text-white hover:bg-[#244e71]"
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/seeker/profile", {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      onOpenChange(false);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setConfirmText("");
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#2B5B84]">Delete account</DialogTitle>
          <DialogDescription>
            This permanently removes your candidate profile and reference data.
            Type <strong>DELETE</strong> to confirm.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="h-11"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter className="mx-0 mb-0 border-0 bg-transparent p-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={confirmText !== "DELETE" || busy}
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => void onDelete()}
          >
            {busy ? "Deleting…" : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function toFormValues(data: SeekerDashboardData): EditValues {
  return {
    headline: data.headline,
    selectedTagline: data.selectedTagline,
    globalCity: data.globalCity,
    globalCountry: data.globalCountry,
    timezoneOffset:
      data.timezoneOffset === null || data.timezoneOffset === undefined
        ? ""
        : String(data.timezoneOffset),
    verifiedSkills: data.verifiedSkills.join(", "),
  };
}
