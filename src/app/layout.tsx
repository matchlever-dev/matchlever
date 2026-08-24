import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

import { SiteChrome } from "@/components/brand/site-chrome";
import { LandingFooter } from "@/components/landing/landing-footer";
import { getNavSession } from "@/lib/auth/nav-session.server";
import {
  DEFAULT_BRAND_TAGLINE,
  getSiteCopy,
} from "@/lib/marketing/site-copy";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { brandTagline } = await getSiteCopy();
  return {
    title: "MatchLever",
    description: `${brandTagline} Connect with vetted talents at no cost until a match is made.`,
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon.png", type: "image/png", sizes: "192x192" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
    },
  };
}

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [navSession, siteCopy] = await Promise.all([
    getNavSession(),
    getSiteCopy(),
  ]);
  const brandTagline = siteCopy.brandTagline || DEFAULT_BRAND_TAGLINE;

  return (
    <html lang="en">
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <SiteChrome initialSession={navSession}>
          <div className="flex min-h-[100svh] flex-col">
            <div className="flex-1">{children}</div>
            <LandingFooter brandTagline={brandTagline} />
          </div>
        </SiteChrome>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
