import { getGeoFromHeaders } from '@/lib/geo/country'
import {
  bcp47Locale,
  convertFromUSD,
  currencyForCountry,
  type Currency,
} from '@/lib/pricing/currency'
import { PLAN_PRICING_USD } from '@/lib/pricing/plans'
import { PricingTableClient, type PricedPlan } from './PricingTableClient'

const COUNTRY_NAMES: Record<string, string> = {
  CA: 'Canada',
}

/**
 * Server wrapper: detecta país, convierte precios USD → moneda local,
 * pasa todo al cliente. Modelo de cobro: base mensual + por trabajador
 * activo (sin topes de empleados) — la fuente de los números es
 * src/lib/pricing/plans.ts.
 *
 *   Geo CA → CAD (1 USD ≈ 1.37 CAD)
 *   Geo otro → USD (default; mercado US+CA — EUR eliminado 2026-07-12)
 *
 * El hint "precios en X · país" solo se muestra cuando hubo conversión
 * (CAD): mostrar "detected France" con precios USD confundía a visitantes
 * de mercados que no atendemos.
 */
export function PricingTable({ locale }: { locale: string }) {
  const geo = getGeoFromHeaders()
  const currency: Currency = currencyForCountry(geo.country)
  const bcp47 = bcp47Locale(locale)
  const countryHint =
    currency !== 'USD' && geo.country && COUNTRY_NAMES[geo.country]
      ? COUNTRY_NAMES[geo.country]
      : null

  const PLANS: Omit<PricedPlan, 'base' | 'perWorker'>[] = [
    { key: 'essential', cta: 'start' },
    { key: 'advanced', popular: true, cta: 'start' },
    { key: 'premium', cta: 'sales' },
  ]

  const plans: PricedPlan[] = PLANS.map((p) => ({
    ...p,
    base: convertFromUSD(PLAN_PRICING_USD[p.key].base, currency),
    perWorker: convertFromUSD(PLAN_PRICING_USD[p.key].perWorker, currency),
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
