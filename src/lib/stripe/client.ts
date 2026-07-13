import Stripe from 'stripe'

/**
 * Cliente Stripe singleton. SOLO para uso en server (API routes, Server Actions).
 *
 * El stripe-node SDK requiere `apiVersion` para que TS infiera los tipos de
 * la versión correcta del API. Ajustar al string de la última API de Stripe.
 */
let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY no está configurada.')
  }

  // El apiVersion se actualiza según la versión instalada del SDK.
  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
    typescript: true,
    appInfo: { name: 'MyJova', version: '0.1.0' },
  })
  return stripeClient
}

/**
 * Mapeo plan code → env vars con los price IDs (modelo base + por-trabajador).
 * Cada plan tiene DOS precios en Stripe: la base mensual (flat) y el seat
 * por trabajador activo (licensed per-unit). Los IDs vienen del Dashboard
 * después de crear los 3 productos con sus 2 precios cada uno.
 */
export function getStripePriceIds(planCode: 'essential' | 'advanced' | 'premium'): {
  base: string
  seat: string
} {
  const prefix =
    planCode === 'essential'
      ? 'STRIPE_PRICE_ESSENTIAL'
      : planCode === 'advanced'
        ? 'STRIPE_PRICE_ADVANCED'
        : 'STRIPE_PRICE_PREMIUM'
  const base = process.env[`${prefix}_BASE`]
  const seat = process.env[`${prefix}_SEAT`]
  if (!base) throw new Error(`${prefix}_BASE no está configurada.`)
  if (!seat) throw new Error(`${prefix}_SEAT no está configurada.`)
  return { base, seat }
}
