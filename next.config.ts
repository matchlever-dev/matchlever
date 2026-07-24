import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf", "mammoth", "openai", "groq-sdk"],
};

export default nextConfig;
