/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@azure/openai', '@azure/search-documents']
  }
}

module.exports = nextConfig