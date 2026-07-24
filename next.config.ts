import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdf-parse",
    "mammoth",
    "openai",
    "groq-sdk",
    "@napi-rs/canvas",
  ],
};

export default nextConfig;
