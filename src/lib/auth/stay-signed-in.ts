/** Preference cookie: keep the Supabase session cookie alive for 60 minutes. */
export const STAY_SIGNED_IN_COOKIE = "ml_stay_signed_in";
export const STAY_SIGNED_IN_SECONDS = 60 * 60;

type SameSite = boolean | "lax" | "strict" | "none";

export type AuthCookieOptions = {
  path?: string;
  maxAge?: number;
  sameSite?: SameSite;
  secure?: boolean;
  domain?: string;
  httpOnly?: boolean;
  priority?: "low" | "medium" | "high";
  expires?: Date;
  name?: string;
};

export function staySignedInCookieWriteOptions(): AuthCookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    maxAge: STAY_SIGNED_IN_SECONDS,
    secure: process.env.NODE_ENV === "production",
  };
}

export function isStaySignedInEnabled(
  cookieStore: { get: (name: string) => { value: string } | undefined } | string
): boolean {
  if (typeof cookieStore === "string") {
    return /(?:^|;\s*)ml_stay_signed_in=1(?:;|$)/.test(cookieStore);
  }
  return cookieStore.get(STAY_SIGNED_IN_COOKIE)?.value === "1";
}

/** Merge Stay Signed In maxAge onto Supabase auth cookie writes. */
export function withStaySignedInCookieOptions(
  enabled: boolean,
  options?: AuthCookieOptions
): AuthCookieOptions {
  if (!enabled) return { ...(options ?? {}) };
  return {
    ...(options ?? {}),
    maxAge: STAY_SIGNED_IN_SECONDS,
    path: options?.path ?? "/",
  };
}

export function setStaySignedInPreference(enabled: boolean) {
  if (typeof document === "undefined") return;
  if (enabled) {
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie = `${STAY_SIGNED_IN_COOKIE}=1; Max-Age=${STAY_SIGNED_IN_SECONDS}; Path=/; SameSite=Lax${secure}`;
  } else {
    document.cookie = `${STAY_SIGNED_IN_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
}
