import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the app deploys as plain files (no server routes).
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  devIndicators: false,
};

export default nextConfig;
