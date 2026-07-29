import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "Log in · MatchLever",
  description: "Sign in to your MatchLever candidate dashboard or staff portal.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-[100svh] flex-col bg-[#F7F6F3] text-[#2A2D34]">
      <div className="mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-16 sm:px-8">
        <Suspense
          fallback={
            <p className="text-sm text-[#5B616B]">Loading sign-in…</p>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
      <LandingFooter />
    </main>
  );
}
