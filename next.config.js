const createNextIntlPlugin = require('next-intl/plugin')

// Apunta al archivo de configuración i18n (locales soportados, defaultLocale, etc.).
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
}

module.exports = withNextIntl(nextConfig)
