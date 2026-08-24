import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

import { SiteChrome } from "@/components/brand/site-chrome";
import { LandingFooter } from "@/components/landing/landing-footer";
import { getNavSession } from "@/lib/auth/nav-session.server";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "MatchLever",
  description:
    "No names. No bias. Just the right match. Connect with vetted talents at no cost until a match is made.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navSession = await getNavSession();

  return (
    <html lang="en">
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <SiteChrome initialSession={navSession}>
          <div className="flex min-h-[100svh] flex-col">
            <div className="flex-1">{children}</div>
            <LandingFooter />
          </div>
        </SiteChrome>
      </body>
    </html>
  );
}
