"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_FAQ_ITEMS,
  faqItemAnchorId,
  faqItemLinkLabel,
  type FaqItem,
  type FaqItemDraft,
} from "@/lib/marketing/faq";

function toDraft(item: FaqItem): FaqItemDraft {
  return {
    id: item.id.startsWith("default-") || item.id.startsWith("demo-")
      ? undefined
      : item.id,
    question: item.question,
    answer: item.answer,
  };
}

function createEmptyDraft(): FaqItemDraft {
  return { question: "", answer: "" };
}

export function AdminFaqPage() {
  const [items, setItems] = useState<FaqItemDraft[]>(
    DEFAULT_FAQ_ITEMS.map(toDraft)
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
      const res = await fetch("/api/admin/faq");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load FAQ");

      const loaded = Array.isArray(json.items) ? (json.items as FaqItem[]) : [];
      setItems(
        loaded.length > 0
          ? loaded.map(toDraft)
          : DEFAULT_FAQ_ITEMS.map(toDraft)
      );
      setDemo(Boolean(json.demo));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateItem(index: number, patch: Partial<FaqItemDraft>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
    setSaveMessage(null);
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    setItems((current) => {
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
      return next;
    });
    setSaveMessage(null);
  }

  function removeItem(index: number) {
    setItems((current) =>
      current.length <= 1 ? current : current.filter((_, i) => i !== index)
    );
    setSaveMessage(null);
  }

  function addItem() {
    setItems((current) => [...current, createEmptyDraft()]);
    setSaveMessage(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/admin/faq", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");

      if (Array.isArray(json.items)) {
        setItems((json.items as FaqItem[]).map(toDraft));
      }
      setSaveMessage(json.demo ? "Saved (demo mode - not persisted)" : "Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPortalShell title="FAQ">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-[#E87A5D] uppercase">
            Marketing
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#2B5B84]">
            FAQ content
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#5B616B]">
            Edit questions and answers shown on the public FAQ page. Use blank
            lines between paragraphs in each answer.
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
        <p className="text-sm text-[#5B616B]">Loading FAQ...</p>
      ) : (
        <form
          className="max-w-3xl space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <nav
            aria-label="FAQ sections"
            className="border border-[#2B5B84]/15 bg-white p-5 sm:p-6"
          >
            <h2 className="font-display text-sm font-semibold text-[#2B5B84]">
              Jump to question
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              {items.map((item, index) => (
                <li key={faqItemAnchorId(index)}>
                  <a
                    href={`#${faqItemAnchorId(index)}`}
                    className="text-sm text-[#2B5B84] underline-offset-2 transition hover:text-[#E87A5D] hover:underline"
                  >
                    {faqItemLinkLabel(item.question, index)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {items.map((item, index) => (
            <section
              id={faqItemAnchorId(index)}
              key={item.id ?? `draft-${index}`}
              className="scroll-mt-24 border border-[#2B5B84]/15 bg-white p-5 sm:p-6"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="font-display text-sm font-semibold text-[#2B5B84]">
                  Item {index + 1}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={index === 0 || saving}
                    onClick={() => moveItem(index, -1)}
                    aria-label="Move up"
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={index === items.length - 1 || saving}
                    onClick={() => moveItem(index, 1)}
                    aria-label="Move down"
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={items.length <= 1 || saving}
                    onClick={() => removeItem(index)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor={`faq-question-${index}`}>Question</Label>
                  <Input
                    id={`faq-question-${index}`}
                    value={item.question}
                    onChange={(e) =>
                      updateItem(index, { question: e.target.value })
                    }
                    maxLength={500}
                    required
                    disabled={saving}
                    className="h-10"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`faq-answer-${index}`}>Answer</Label>
                  <Textarea
                    id={`faq-answer-${index}`}
                    value={item.answer}
                    onChange={(e) =>
                      updateItem(index, { answer: e.target.value })
                    }
                    maxLength={10000}
                    required
                    disabled={saving}
                    rows={8}
                  />
                </div>
              </div>
            </section>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={saving || items.length >= 50}
              onClick={addItem}
              className="border-[#2B5B84]/25 text-[#2B5B84]"
            >
              <Plus className="size-4" />
              Add question
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#2B5B84] text-white hover:bg-[#244e70]"
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
            {saveMessage && (
              <span className="text-xs text-[#2B5B84]">{saveMessage}</span>
            )}
          </div>
        </form>
      )}
    </AdminPortalShell>
  );
}
