import { NextResponse } from "next/server";

import { requireAdminFlagApi } from "@/lib/auth/api-guards";
import {
  DEFAULT_FAQ_ITEMS,
  faqUpdateSchema,
  mapFaqRows,
  type FaqItem,
} from "@/lib/marketing/faq";
import { getFaqItems } from "@/lib/marketing/faq.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAdminFlagApi();
  if (!auth.ok) return auth.response;

  if (auth.actor.demo) {
    return NextResponse.json({
      demo: true,
      items: DEFAULT_FAQ_ITEMS,
    });
  }

  const items = await getFaqItems();
  return NextResponse.json({ demo: false, items });
}

export async function PUT(request: Request) {
  const auth = await requireAdminFlagApi();
  if (!auth.ok) return auth.response;

  const parsed = faqUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const normalizedItems = parsed.data.items.map((item, index) => ({
    question: item.question.trim(),
    answer: item.answer.trim(),
    sortOrder: index,
  }));

  if (auth.actor.demo) {
    const items: FaqItem[] = normalizedItems.map((item, index) => ({
      id: parsed.data.items[index]?.id ?? `demo-${index}`,
      question: item.question,
      answer: item.answer,
      sortOrder: item.sortOrder,
    }));
    return NextResponse.json({
      ok: true,
      demo: true,
      items,
    });
  }

  const admin = createAdminClient();
  const client = admin ?? (await createClient());

  const { data: existingRows, error: loadError } = await client
    .from("faq_items")
    .select("id");

  if (loadError) {
    console.error("[admin faq]", loadError.message);
    return NextResponse.json(
      { error: "Unable to load existing FAQ items" },
      { status: 500 }
    );
  }

  const existingIds = new Set((existingRows ?? []).map((row) => row.id));
  const incomingIds = new Set(
    parsed.data.items.flatMap((item) => (item.id ? [item.id] : []))
  );

  const idsToDelete = [...existingIds].filter((id) => !incomingIds.has(id));
  if (idsToDelete.length > 0) {
    const { error: deleteError } = await client
      .from("faq_items")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.error("[admin faq]", deleteError.message);
      return NextResponse.json(
        { error: "Unable to remove deleted FAQ items" },
        { status: 500 }
      );
    }
  }

  const savedItems: FaqItem[] = [];

  for (const [index, item] of normalizedItems.entries()) {
    const draft = parsed.data.items[index];
    const payload = {
      question: item.question,
      answer: item.answer,
      sort_order: item.sortOrder,
    };

    if (draft?.id && existingIds.has(draft.id)) {
      const { data, error } = await client
        .from("faq_items")
        .update(payload)
        .eq("id", draft.id)
        .select("id, question, answer, sort_order")
        .single();

      if (error || !data) {
        console.error("[admin faq]", error?.message);
        return NextResponse.json(
          { error: "Unable to update FAQ item" },
          { status: 500 }
        );
      }

      savedItems.push(mapFaqRows([data])[0]!);
      continue;
    }

    const { data, error } = await client
      .from("faq_items")
      .insert(payload)
      .select("id, question, answer, sort_order")
      .single();

    if (error || !data) {
      console.error("[admin faq]", error?.message);
      return NextResponse.json(
        { error: "Unable to create FAQ item" },
        { status: 500 }
      );
    }

    savedItems.push(mapFaqRows([data])[0]!);
  }

  return NextResponse.json({
    ok: true,
    items: savedItems.sort((a, b) => a.sortOrder - b.sortOrder),
  });
}
