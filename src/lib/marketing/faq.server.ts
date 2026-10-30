import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  DEFAULT_FAQ_ITEMS,
  mapFaqRows,
  type FaqItem,
} from "@/lib/marketing/faq";

/** Load FAQ items for public pages. Falls back to defaults. */
export async function getFaqItems(): Promise<FaqItem[]> {
  if (!isSupabaseConfigured()) {
    return DEFAULT_FAQ_ITEMS;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("faq_items")
      .select("id, question, answer, sort_order")
      .order("sort_order", { ascending: true });

    if (error || !data?.length) {
      if (error) {
        console.error("[faq]", error.message);
      }
      return DEFAULT_FAQ_ITEMS;
    }

    const items = mapFaqRows(data);
    return items.length > 0 ? items : DEFAULT_FAQ_ITEMS;
  } catch (err) {
    console.error("[faq]", err);
    return DEFAULT_FAQ_ITEMS;
  }
}
