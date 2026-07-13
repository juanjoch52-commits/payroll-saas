import { createAdminClient, createClient } from '@/lib/supabase/server'
import { monthlyTotalCents } from '@/lib/pricing/plans'

/**
 * Seats — modelo base + por-trabajador-activo.
 *
 * Un "seat" = empleado con status 'active' (mismo criterio que usaba el cap
 * del plan). on_leave y terminated NO se facturan. Los sub-workers de
 * contratistas SÍ cuentan: fichan y entran en nómina como cualquier worker.
 *
 * La cantidad vive como un subscription item "licensed" en Stripe
 * (STRIPE_PRICE_<PLAN>_SEAT). La sincronizamos best-effort en cada alta/cambio
 * de status y al abrir /billing; con proration_behavior 'none' el cambio se
 * cobra en la SIGUIENTE factura (sin micro-prorrateos a mitad de ciclo).
 */

type Db = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>

export async function countActiveWorkers(db: Db, organizationId: string): Promise<number> {
  const { count } = await db
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'active')
  return count ?? 0
}

function seatEnvKey(planCode: string): string | null {
  if (planCode === 'essential') return 'STRIPE_PRICE_ESSENTIAL_SEAT'
  if (planCode === 'advanced') return 'STRIPE_PRICE_ADVANCED_SEAT'
  if (planCode === 'premium') return 'STRIPE_PRICE_PREMIUM_SEAT'
  return null
}

/** Los 3 seat price IDs configurados (para reconocer el item en la suscripción). */
function allSeatPriceIds(): Set<string> {
  const ids = [
    process.env.STRIPE_PRICE_ESSENTIAL_SEAT,
    process.env.STRIPE_PRICE_ADVANCED_SEAT,
    process.env.STRIPE_PRICE_PREMIUM_SEAT,
  ].filter((v): v is string => Boolean(v))
  return new Set(ids)
}

/**
 * Sincroniza la cantidad de seats de la suscripción de Stripe con los
 * trabajadores activos actuales. Best-effort: sin Stripe configurado o sin
 * suscripción es un no-op silencioso; NUNCA lanza (los callers la disparan
 * tras crear/terminar empleados y no debe romper esas acciones).
 */
export async function syncStripeSeats(organizationId: string): Promise<void> {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return

    const admin = createAdminClient()
    const { data: sub } = await admin
      .from('subscriptions')
      .select('stripe_subscription_id, status, plans:plan_id (code)')
      .eq('organization_id', organizationId)
      .maybeSingle()

    const subscriptionId = sub?.stripe_subscription_id as string | null | undefined
    if (!subscriptionId) return
    if (!['active', 'trialing', 'past_due'].includes((sub?.status as string) ?? '')) return

    const plansData = sub?.plans as unknown
    const planCode =
      (Array.isArray(plansData)
        ? (plansData[0] as { code?: string })?.code
        : (plansData as { code?: string } | null)?.code) ?? null

    const quantity = await countActiveWorkers(admin, organizationId)

    const { getStripe } = await import('@/lib/stripe/client')
    const stripe = getStripe()
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    const seatIds = allSeatPriceIds()
    const seatItem = subscription.items.data.find((it) => seatIds.has(it.price.id))

    if (seatItem) {
      if (seatItem.quantity !== quantity) {
        await stripe.subscriptionItems.update(seatItem.id, {
          quantity,
          proration_behavior: 'none',
        })
      }
      return
    }

    // La suscripción no tiene item de seats todavía (p. ej. checkout con 0
    // trabajadores): lo añadimos con el precio del plan vigente.
    if (quantity > 0 && planCode) {
      const envKey = seatEnvKey(planCode)
      const seatPriceId = envKey ? process.env[envKey] : undefined
      if (seatPriceId) {
        await stripe.subscriptionItems.create({
          subscription: subscriptionId,
          price: seatPriceId,
          quantity,
          proration_behavior: 'none',
        })
      }
    }
  } catch {
    // Best-effort: la próxima sincronización (o abrir /billing) reconcilia.
  }
}

/**
 * MRR estimado para el admin panel: Σ (base + activos × por-trabajador) de
 * las suscripciones activas. Los conteos se agrupan en memoria — al volumen
 * actual de tenants es más que suficiente.
 */
export async function estimateMrrCents(admin: Db): Promise<number> {
  const { data: subs } = await admin
    .from('subscriptions')
    .select('organization_id, plans:plan_id (base_price_cents, per_worker_price_cents)')
    .eq('status', 'active')

  const rows = (subs ?? []) as {
    organization_id: string
    plans:
      | { base_price_cents?: number; per_worker_price_cents?: number }
      | { base_price_cents?: number; per_worker_price_cents?: number }[]
      | null
  }[]
  if (rows.length === 0) return 0

  const orgIds = rows.map((r) => r.organization_id)
  const { data: actives } = await admin
    .from('employees')
    .select('organization_id')
    .in('organization_id', orgIds)
    .eq('status', 'active')

  const countByOrg = new Map<string, number>()
  for (const e of (actives ?? []) as { organization_id: string }[]) {
    countByOrg.set(e.organization_id, (countByOrg.get(e.organization_id) ?? 0) + 1)
  }

  return rows.reduce((sum, r) => {
    const plan = Array.isArray(r.plans) ? r.plans[0] : r.plans
    return (
      sum +
      monthlyTotalCents(
        plan?.base_price_cents ?? 0,
        plan?.per_worker_price_cents ?? 0,
        countByOrg.get(r.organization_id) ?? 0,
      )
    )
  }, 0)
}
