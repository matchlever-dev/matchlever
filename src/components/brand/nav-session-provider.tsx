"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  GUEST_NAV_SESSION,
  type NavSession,
} from "@/lib/auth/nav-session";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type NavSessionContextValue = {
  session: NavSession;
  ready: boolean;
  refresh: () => Promise<void>;
};

const NavSessionContext = createContext<NavSessionContextValue | null>(null);

export function NavSessionProvider({
  initialSession,
  children,
}: {
  initialSession: NavSession;
  children: React.ReactNode;
}) {
  const [session, setSession] = useState(initialSession);
  const [ready, setReady] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me/nav", { cache: "no-store" });
      if (!res.ok) return;
      const next = (await res.json()) as NavSession;
      setSession(next);
    } catch {
      setSession(GUEST_NAV_SESSION);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  const value = useMemo(
    () => ({ session, ready, refresh }),
    [session, ready, refresh]
  );

  return (
    <NavSessionContext.Provider value={value}>
      {children}
    </NavSessionContext.Provider>
  );
}

export function useNavSession() {
  const context = useContext(NavSessionContext);
  if (!context) {
    throw new Error("useNavSession must be used within NavSessionProvider");
  }
  return context;
}
