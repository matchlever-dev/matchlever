import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in · MatchLever",
  description: "Sign in to your MatchLever candidate dashboard or staff portal.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 items-center bg-[#F7F6F3] text-[#2A2D34]">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <Suspense
          fallback={
            <p className="text-sm text-[#5B616B]">Loading sign-in…</p>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
