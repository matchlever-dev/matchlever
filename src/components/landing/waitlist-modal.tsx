"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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

const waitlistSchema = z.object({
  email: z.string().email("Enter a valid work email"),
  company: z.string().min(1, "Company is required"),
});

type WaitlistValues = z.infer<typeof waitlistSchema>;

export function WaitlistModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistValues>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { email: "", company: "" },
  });

  async function onSubmit(values: WaitlistValues) {
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      throw new Error("Failed to join waitlist");
    }
    setSubmitted(true);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setSubmitted(false);
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="text-[#2B5B84]">
            Join Exclusive Beta Waitlist
          </DialogTitle>
          <DialogDescription>
            Hirer access is invite-only for Phase 1. Leave your details and
            we&apos;ll reach out when seats open.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <p className="rounded-lg bg-[#2B5B84]/10 px-3 py-3 text-sm text-[#2B5B84]">
            You&apos;re on the list. We&apos;ll email you when the hirer beta
            opens.
          </p>
        ) : (
          <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="waitlist-email">Work email</Label>
              <Input
                id="waitlist-email"
                type="email"
                placeholder="you@company.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="waitlist-company">Company</Label>
              <Input
                id="waitlist-company"
                placeholder="Acme Corp"
                {...register("company")}
              />
              {errors.company && (
                <p className="text-xs text-destructive">
                  {errors.company.message}
                </p>
              )}
            </div>
            <DialogFooter className="mx-0 mb-0 border-0 bg-transparent p-0">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#E87A5D] text-white hover:bg-[#d66a4f]"
              >
                {isSubmitting ? "Joining…" : "Request beta access"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
