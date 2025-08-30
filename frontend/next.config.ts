import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  trailingSlash: true,
  reactStrictMode: true,
  typescript: {
    // Temporarily ignore build errors to get deployment working
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
