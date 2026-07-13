import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://myjova.com'

/**
 * Sitemap dinámico. Lista las URLs públicas de la landing en los 2 locales.
 * Las rutas autenticadas y de admin NO se listan (no se indexan).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ['en', 'es'] as const
  const now = new Date()

  return locales.flatMap((locale) => [
    {
      url: `${BASE_URL}/${locale}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/${locale}/login`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/${locale}/signup`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
  ])
}
