const createNextIntlPlugin = require('next-intl/plugin')

// Apunta al archivo de configuración i18n (locales soportados, defaultLocale, etc.).
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // El lint se corre aparte (`npm run lint`); no bloquea el build de producción
  // para no romper el deploy por warnings de estilo pre-existentes.
  eslint: {
    ignoreDuringBuilds: true,
  },
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
