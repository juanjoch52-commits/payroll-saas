import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { getStripe, getStripePriceId } from '@/lib/stripe/client'

// =============================================================================
// POST /api/stripe/checkout
// =============================================================================
// Crea una sesión de Stripe Checkout para que la org actualice su plan.
// Devuelve { url } que el cliente usa para redirigir.
// =============================================================================

const bodySchema = z.object({
  planCode: z.enum(['essential', 'advanced', 'premium']),
  locale: z.enum(['en', 'es']).default('en'),
})

export async function POST(req: Request) {
  const session = await requireSession('/en/login')
  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { planCode, locale } = parsed.data

  const supabase = createClient()
  const stripe = getStripe()

  // 1) Trae la subscription actual (puede haber stripe_customer_id ya creado).
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', session.organizationId)
    .single()

  // 2) Crear o reusar customer.
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

  // 3) Crear sesión de checkout.
  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: getStripePriceId(planCode), quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/billing?stripe=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/billing?stripe=canceled`,
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
