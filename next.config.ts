import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf", "mammoth", "openai", "groq-sdk"],
  async redirects() {
    return [
      // Legacy seeker → talent
      {
        source: "/dashboard/seeker",
        destination: "/dashboard/talent",
        permanent: true,
      },
      {
        source: "/dashboard/seeker/:path*",
        destination: "/dashboard/talent/:path*",
        permanent: true,
      },
      {
        source: "/legal/seekers",
        destination: "/legal/talent",
        permanent: true,
      },
      {
        source: "/api/dashboard/seeker",
        destination: "/api/dashboard/talent",
        permanent: true,
      },
      {
        source: "/api/dashboard/seeker/:path*",
        destination: "/api/dashboard/talent/:path*",
        permanent: true,
      },
      // Legacy candidate → talent
      {
        source: "/dashboard/candidate",
        destination: "/dashboard/talent",
        permanent: true,
      },
      {
        source: "/dashboard/candidate/:path*",
        destination: "/dashboard/talent/:path*",
        permanent: true,
      },
      {
        source: "/legal/candidates",
        destination: "/legal/talent",
        permanent: true,
      },
      {
        source: "/legal/matchlever-seeker-terms-of-service.pdf",
        destination: "/legal/matchlever-talent-terms-of-service.pdf",
        permanent: true,
      },
      {
        source: "/admin/candidates",
        destination: "/admin/talent",
        permanent: true,
      },
      {
        source: "/admin/candidates/:path*",
        destination: "/admin/talent/:path*",
        permanent: true,
      },
      {
        source: "/superuser/candidates",
        destination: "/superuser/talent",
        permanent: true,
      },
      {
        source: "/superuser/candidates/:path*",
        destination: "/superuser/talent/:path*",
        permanent: true,
      },
      {
        source: "/api/dashboard/candidate",
        destination: "/api/dashboard/talent",
        permanent: true,
      },
      {
        source: "/api/dashboard/candidate/:path*",
        destination: "/api/dashboard/talent/:path*",
        permanent: true,
      },
      {
        source: "/api/admin/candidates",
        destination: "/api/admin/talent",
        permanent: true,
      },
      {
        source: "/api/admin/candidates/:path*",
        destination: "/api/admin/talent/:path*",
        permanent: true,
      },
      {
        source: "/api/candidate",
        destination: "/api/talent",
        permanent: true,
      },
      {
        source: "/api/candidate/:path*",
        destination: "/api/talent/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
