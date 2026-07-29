"use client";

import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
import { Textarea } from "@/components/ui/textarea";
import {
  CONTACT_TOPICS,
  contactFormSchema,
  isAllowedAttachment,
  MAX_MESSAGE_LENGTH,
  type ContactFormValues,
} from "@/lib/contact/schema";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { email: "", topic: "", message: "" },
  });

  const message = watch("message") ?? "";
  const remaining = MAX_MESSAGE_LENGTH - message.length;

  async function onSubmit(values: ContactFormValues) {
    setSubmitError(null);
    setAttachmentError(null);

    const file = fileRef.current?.files?.[0] ?? null;
    if (file && file.size > 0) {
      const fileError = isAllowedAttachment(file);
      if (fileError) {
        setAttachmentError(fileError);
        return;
      }
    }

    const body = new FormData();
    body.set("email", values.email);
    body.set("topic", values.topic);
    body.set("message", values.message);
    if (file && file.size > 0) {
      body.set("attachment", file);
    }

    const res = await fetch("/api/contact", {
      method: "POST",
      body,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSubmitError(
        typeof json.error === "string" ? json.error : "Unable to send message"
      );
      return;
    }

    setSubmitted(true);
    reset();
    setAttachmentName(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-[#2B5B84]/15 bg-white px-5 py-8 text-center sm:px-8">
        <p className="font-display text-lg font-semibold text-[#2B5B84]">
          Message sent
        </p>
        <p className="mt-2 text-sm text-[#5B616B]">
          Thanks for reaching out. We&apos;ll get back to you at the email you
          provided.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          onClick={() => setSubmitted(false)}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      className="grid gap-5 rounded-lg border border-[#2B5B84]/15 bg-white px-5 py-6 sm:px-8 sm:py-8"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="grid gap-2">
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label>Topic</Label>
        <Controller
          control={control}
          name="topic"
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={(value) => field.onChange(value ?? "")}
            >
              <SelectTrigger className="h-10 w-full min-w-0">
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TOPICS.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.topic && (
          <p className="text-xs text-destructive">{errors.topic.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-3">
          <Label htmlFor="contact-message">Message</Label>
          <span
            className={`text-xs ${remaining < 0 ? "text-destructive" : "text-[#5B616B]"}`}
          >
            {message.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>
        <Textarea
          id="contact-message"
          rows={5}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="How can we help?"
          className="min-h-28 resize-y"
          {...register("message")}
        />
        {errors.message && (
          <p className="text-xs text-destructive">{errors.message.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contact-attachment">Attachment (optional)</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            ref={fileRef}
            id="contact-attachment"
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
            className="h-10 max-w-xs cursor-pointer rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm file:mr-3 file:cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setAttachmentError(null);
              if (!file) {
                setAttachmentName(null);
                return;
              }
              const fileError = isAllowedAttachment(file);
              if (fileError) {
                setAttachmentError(fileError);
                setAttachmentName(null);
                event.target.value = "";
                return;
              }
              setAttachmentName(file.name);
            }}
          />
          <p className="text-xs leading-snug text-[#5B616B]">
            If you are reporting an issue, please attach screenshot or other
            document.
          </p>
        </div>
        {attachmentName && (
          <p className="text-xs text-[#2B5B84]">Selected: {attachmentName}</p>
        )}
        {attachmentError && (
          <p className="text-xs text-destructive">{attachmentError}</p>
        )}
      </div>

      {submitError && (
        <p className="text-sm text-destructive">{submitError}</p>
      )}

      <div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#E87A5D] text-white hover:bg-[#d66a4f]"
        >
          {isSubmitting ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
