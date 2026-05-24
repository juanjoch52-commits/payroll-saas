/**
 * Detección de país y región desde headers HTTP.
 *
 * Fuentes (en orden de preferencia):
 *   1. `x-vercel-ip-country` / `x-vercel-ip-country-region` — Vercel Edge (prod)
 *   2. `cf-ipcountry` — Cloudflare (si está delante)
 *   3. `x-myjova-country` / `x-myjova-region` — override manual (testing)
 *
 * Server-only.
 */
import { headers } from 'next/headers'
import type { Locale } from '@/i18n/config'

export type GeoLocation = {
  /** ISO 3166-1 alpha-2 (e.g. 'US', 'CA', 'FR') */
  country: string | null
  /** Sub-division code (e.g. 'QC' for Quebec, 'NY' for New York) */
  region: string | null
}

export function getGeoFromHeaders(): GeoLocation {
  try {
    const h = headers()
    const country =
      h.get('x-myjova-country') ??
      h.get('x-vercel-ip-country') ??
      h.get('cf-ipcountry') ??
      null
    const region =
      h.get('x-myjova-region') ??
      h.get('x-vercel-ip-country-region') ??
      null
    return {
      country: country ? country.toUpperCase() : null,
      region: region ? region.toUpperCase() : null,
    }
  } catch {
    // headers() throws outside request context
    return { country: null, region: null }
  }
}

/**
 * Determina el locale preferido a partir de geo + Accept-Language.
 *
 * Reglas:
 *   - Quebec (CA-QC) → fr-CA (ley 96 exige FR; mayoría francófona)
 *   - Resto de Canadá → en (mayoría anglófona)
 *   - Francia / Bélgica / Suiza / Mónaco / Luxemburgo → fr
 *   - España / México / LATAM → es
 *   - Resto → en (US-first MVP)
 *
 * Accept-Language es un fallback cuando no hay geo.
 */
export function preferredLocaleFor(
  geo: GeoLocation,
  acceptLanguage: string | null,
): Locale {
  const country = geo.country
  const region = geo.region

  if (country === 'CA' && region === 'QC') return 'fr-CA'
  if (country === 'CA') return 'en'

  if (country && ['FR', 'BE', 'CH', 'MC', 'LU'].includes(country)) return 'fr'

  if (
    country &&
    [
      'ES', 'MX', 'AR', 'CL', 'PE', 'CO', 'VE', 'EC', 'PR', 'DO',
      'UY', 'PY', 'BO', 'GT', 'HN', 'NI', 'CR', 'PA', 'SV', 'CU',
    ].includes(country)
  )
    return 'es'

  // Accept-Language fallback
  const al = (acceptLanguage ?? '').toLowerCase()
  if (al.startsWith('fr-ca')) return 'fr-CA'
  if (al.startsWith('fr')) return 'fr'
  if (al.startsWith('es')) return 'es'

  return 'en'
}
