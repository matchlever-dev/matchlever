import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf", "mammoth", "openai", "groq-sdk"],
  async redirects() {
    return [
      {
        source: "/dashboard/seeker",
        destination: "/dashboard/candidate",
        permanent: true,
      },
      {
        source: "/dashboard/seeker/:path*",
        destination: "/dashboard/candidate/:path*",
        permanent: true,
      },
      {
        source: "/legal/seekers",
        destination: "/legal/candidates",
        permanent: true,
      },
      {
        source: "/api/dashboard/seeker",
        destination: "/api/dashboard/candidate",
        permanent: true,
      },
      {
        source: "/api/dashboard/seeker/:path*",
        destination: "/api/dashboard/candidate/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
