import type { NextConfig } from "next";

const nextConfig = {
  experimental: { appDir: true },
  allowedDevOrigins: ["http://192.168.1.21:3002"],
};

module.exports = nextConfig;