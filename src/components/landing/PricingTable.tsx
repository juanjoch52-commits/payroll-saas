import { getGeoFromHeaders } from '@/lib/geo/country'
import {
  bcp47Locale,
  convertFromUSD,
  currencyForCountry,
  type Currency,
} from '@/lib/pricing/currency'
import { PricingTableClient, type PricedPlan } from './PricingTableClient'

const COUNTRY_NAMES: Record<string, string> = {
  CA: 'Canada',
  US: 'United States',
  FR: 'France',
  BE: 'Belgique',
  CH: 'Suisse',
  ES: 'España',
  MX: 'México',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Perú',
  DE: 'Deutschland',
  IT: 'Italia',
  PT: 'Portugal',
  NL: 'Nederland',
}

/**
 * Server wrapper: detecta país, convierte precios USD → moneda local,
 * pasa todo al cliente que mantiene el toggle Monthly/Annual.
 *
 *   Geo CA → CAD (1 USD ≈ 1.37 CAD), $49 → CA$67
 *   Geo FR/DE/ES → EUR
 *   Geo otro → USD (default)
 */
export function PricingTable({ locale }: { locale: string }) {
  const geo = getGeoFromHeaders()
  const currency: Currency = currencyForCountry(geo.country)
  const bcp47 = bcp47Locale(locale)
  const countryHint =
    geo.country && COUNTRY_NAMES[geo.country] ? COUNTRY_NAMES[geo.country] : null

  // Base prices in USD; convert per plan
  const PLANS_USD: Omit<PricedPlan, 'monthly' | 'annual'>[] = [
    { key: 'essential', cta: 'start' },
    { key: 'advanced', popular: true, cta: 'start' },
    { key: 'premium', cta: 'sales' },
  ]
  const PRICES_USD = {
    essential: { monthly: 49, annual: 490 },
    advanced: { monthly: 99, annual: 990 },
    premium: { monthly: 199, annual: 1990 },
  } as const

  const plans: PricedPlan[] = PLANS_USD.map((p) => ({
    ...p,
    monthly: convertFromUSD(PRICES_USD[p.key].monthly, currency),
    annual: convertFromUSD(PRICES_USD[p.key].annual, currency),
  }))

  return (
    <PricingTableClient
      locale={locale}
      currency={currency}
      bcp47={bcp47}
      plans={plans}
      countryHint={countryHint}
    />
  )
}
