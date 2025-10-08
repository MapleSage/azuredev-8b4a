/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // output: "export", // Disabled for API routes
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
