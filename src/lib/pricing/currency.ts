/**
 * Currency conversion + formatting para la landing y dashboards.
 *
 * Los precios "fuente" están en USD. Convertimos al display currency según
 * la geolocación detectada (CA → CAD, EU → EUR, resto → USD).
 *
 * Para producción a escala se recomienda:
 *   - actualizar `CURRENCY_RATES` desde una API (ECB, OXR) vía cron diario
 *   - persistir el rate de cada signup para honor el precio al momento del checkout
 *
 * Para este sprint usamos tipos de cambio estables proyectados 2026.
 */

export type Currency = 'USD' | 'CAD' | 'EUR'

/** USD as base = 1. Approximations as of 2026-05. Update via cron in prod. */
export const CURRENCY_RATES: Record<Currency, number> = {
  USD: 1,
  CAD: 1.37,
  EUR: 0.92,
}

/** Display symbol. Avoid bare `$` for non-USD to prevent confusion. */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  CAD: 'CA$',
  EUR: '€',
}

const FRENCH_SPEAKING_LOCALES = new Set(['fr', 'fr-CA', 'fr-FR'])

export function currencyForCountry(country: string | null | undefined): Currency {
  if (!country) return 'USD'
  const c = country.toUpperCase()
  if (c === 'CA') return 'CAD'
  if (['FR', 'BE', 'CH', 'LU', 'DE', 'ES', 'IT', 'NL', 'PT', 'AT', 'IE', 'GR', 'FI'].includes(c))
    return 'EUR'
  return 'USD'
}

/**
 * Returns the converted whole number suitable for plan pricing display.
 * Rounds to the nearest whole unit (no cents) — keeps prices clean ($49 → CA$67).
 */
export function convertFromUSD(usdAmount: number, target: Currency): number {
  if (target === 'USD') return usdAmount
  return Math.round(usdAmount * CURRENCY_RATES[target])
}

/**
 * Intl.NumberFormat respecting the user's locale. Defaults to en-US.
 * Hides cents by default for plan pricing ($49, not $49.00).
 */
export function formatPrice(
  amount: number,
  currency: Currency,
  locale = 'en-US',
  withCents = false,
): string {
  // Map our locales to BCP 47 with country
  const bcp47 = bcp47Locale(locale)
  return new Intl.NumberFormat(bcp47, {
    style: 'currency',
    currency,
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 0,
  }).format(amount)
}

/** App locale (en/es/fr/fr-CA) → BCP 47 with sensible country. */
export function bcp47Locale(locale: string): string {
  if (locale === 'fr-CA') return 'fr-CA'
  if (locale === 'fr') return FRENCH_SPEAKING_LOCALES.has(locale) ? 'fr-FR' : 'fr-FR'
  if (locale === 'es') return 'es-ES'
  return 'en-US'
}

/** Convenience: format a price already given in the target currency (no conversion). */
export function formatInLocale(amount: number, currency: Currency, locale: string): string {
  return formatPrice(amount, currency, bcp47Locale(locale))
}
