import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'
import { locales, type Locale } from './config'

/**
 * Carga los mensajes del locale activo en cada request (Server Components).
 *
 * Apuntado desde `next.config.js` via `createNextIntlPlugin('./src/i18n/request.ts')`.
 * Si el locale no está soportado, devuelve 404.
 */
export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound()

  return {
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
