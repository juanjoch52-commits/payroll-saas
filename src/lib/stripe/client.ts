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
 * Mapeo plan code → env var con price_id.
 * Los IDs vienen de Stripe Dashboard después de crear los productos.
 */
export function getStripePriceId(planCode: 'essential' | 'advanced' | 'premium'): string {
  const key =
    planCode === 'essential'
      ? 'STRIPE_PRICE_ESSENTIAL'
      : planCode === 'advanced'
        ? 'STRIPE_PRICE_ADVANCED'
        : 'STRIPE_PRICE_PREMIUM'
  const id = process.env[key]
  if (!id) throw new Error(`${key} no está configurada.`)
  return id
}
