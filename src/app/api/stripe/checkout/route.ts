import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { getStripe, getStripePriceIds } from '@/lib/stripe/client'
import { countActiveWorkers } from '@/lib/billing/seats'

// =============================================================================
// POST /api/stripe/checkout
// =============================================================================
// Modelo base + por-trabajador-activo:
//  - Sin suscripción de Stripe todavía → sesión de Checkout con dos line items
//    (base qty 1 + seat qty = trabajadores activos).
//  - Con suscripción viva → cambio de plan IN-PLACE (swap de precios base/seat
//    en la suscripción existente). Antes esto creaba una SEGUNDA suscripción
//    en Stripe → doble cobro.
// Devuelve { url } que el cliente usa para redirigir.
// =============================================================================

const bodySchema = z.object({
  planCode: z.enum(['essential', 'advanced', 'premium']),
  locale: z.enum(['en', 'es', 'fr', 'fr-CA']).default('en'),
})

function priceIdSet(kind: 'BASE' | 'SEAT'): Set<string> {
  return new Set(
    ['ESSENTIAL', 'ADVANCED', 'PREMIUM']
      .map((p) => process.env[`STRIPE_PRICE_${p}_${kind}`])
      .filter((v): v is string => Boolean(v)),
  )
}

export async function POST(req: Request) {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }
  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { planCode, locale } = parsed.data

  const supabase = createClient()
  const stripe = getStripe()
  const billingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/billing`

  // 1) Suscripción actual de la org.
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, status')
    .eq('organization_id', session.organizationId)
    .single()

  const prices = getStripePriceIds(planCode)
  const activeWorkers = await countActiveWorkers(supabase, session.organizationId)

  // 2) Ya hay suscripción viva en Stripe → cambio de plan in-place.
  if (
    subscription?.stripe_subscription_id &&
    ['active', 'past_due'].includes(subscription.status ?? '')
  ) {
    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
    const baseItem = stripeSub.items.data.find((it) => priceIdSet('BASE').has(it.price.id))
    const seatItem = stripeSub.items.data.find((it) => priceIdSet('SEAT').has(it.price.id))

    const items: { id?: string; price?: string; quantity?: number }[] = [
      baseItem
        ? { id: baseItem.id, price: prices.base, quantity: 1 }
        : { price: prices.base, quantity: 1 },
    ]
    if (seatItem) items.push({ id: seatItem.id, price: prices.seat, quantity: activeWorkers })
    else if (activeWorkers > 0) items.push({ price: prices.seat, quantity: activeWorkers })

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items,
      proration_behavior: 'create_prorations',
      metadata: { organization_id: session.organizationId, plan_code: planCode },
    })

    // Reflejar el plan en la DB de inmediato (el webhook de Stripe no trae
    // el plan_code en subscription.updated).
    const admin = createAdminClient()
    const { data: plan } = await admin
      .from('plans')
      .select('id, name')
      .eq('code', planCode)
      .single()
    if (plan) {
      await admin
        .from('subscriptions')
        .update({ plan_id: plan.id })
        .eq('organization_id', session.organizationId)

      const { dispatch } = await import('@/lib/notifications/dispatch')
      await dispatch({
        userId: session.userId,
        organizationId: session.organizationId,
        type: 'plan_changed',
        title: 'Plan actualizado',
        body: `Tu organización cambió al plan ${plan.name}. El cambio se prorratea en la próxima factura.`,
        dedupeKey: `plan-changed-${subscription.stripe_subscription_id}-${planCode}`,
      }).catch(() => {})
    }

    return NextResponse.json({ url: `${billingUrl}?stripe=success` })
  }

  // 3) Crear o reusar customer.
  let customerId = subscription?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.email,
      name: session.organizationName,
      metadata: {
        organization_id: session.organizationId,
      },
    })
    customerId = customer.id
  }

  // 4) Crear sesión de checkout: base + seats por trabajador activo.
  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      { price: prices.base, quantity: 1 },
      // Stripe exige quantity >= 1 en checkout; con 0 activos el item se
      // añade después vía syncStripeSeats cuando entre el primer trabajador.
      ...(activeWorkers > 0 ? [{ price: prices.seat, quantity: activeWorkers }] : []),
    ],
    success_url: `${billingUrl}?stripe=success`,
    cancel_url: `${billingUrl}?stripe=canceled`,
    metadata: {
      organization_id: session.organizationId,
      plan_code: planCode,
    },
    subscription_data: {
      metadata: {
        organization_id: session.organizationId,
        plan_code: planCode,
      },
    },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: checkout.url })
}
