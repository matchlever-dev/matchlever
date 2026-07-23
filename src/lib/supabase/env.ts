/** Shared Supabase env guards — prevents Invalid URL crashes from placeholders. */

export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!url || !anonKey) return null;
  if (
    url.includes("your-project") ||
    url.includes("your-") ||
    anonKey.includes("your-")
  ) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
  } catch {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured() {
  return getSupabaseEnv() !== null;
}
