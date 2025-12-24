/** @type {import('next').NextConfig} */
const withNextIntl = require('next-intl/plugin')('./i18n.js');

const nextConfig = {
  reactStrictMode: true,
  env: {
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*'
      }
    ]
  },
  // Disable static page generation errors by skipping problematic pages
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5
  }
}

module.exports = withNextIntl(nextConfig)