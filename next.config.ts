import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "openai", "groq-sdk"],
};

export default nextConfig;
