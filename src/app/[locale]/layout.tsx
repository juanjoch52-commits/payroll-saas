import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales, type Locale } from '@/i18n/config'

/**
 * Layout por locale.
 *
 * Cualquier ruta bajo `/[locale]/*` recibe los mensajes traducidos y el
 * provider de next-intl, que permite usar `useTranslations()` en client
 * components y `getTranslations()` en server components.
 *
 * Llamar `setRequestLocale(locale)` permite que las páginas dentro de este
 * layout se rendericen estáticamente cuando NO usen `headers()`/`cookies()`.
 * Las páginas autenticadas son forzadas a dinámico via el layout de `(app)`.
 */
export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!locales.includes(locale as Locale)) notFound()

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}
