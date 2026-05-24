import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/server'

// =============================================================================
// POST /api/webhooks/stripe — handler de eventos de Stripe
// =============================================================================
// Stripe envía POSTs firmados a esta URL. Validamos la firma con el secret
// del webhook (`STRIPE_WEBHOOK_SECRET`) y actualizamos la subscription
// de la org correspondiente.
//
// Importante: NO usa el client de usuario (no hay sesión) — usa el admin
// client que bypasa RLS.
// =============================================================================

export async function POST(req: Request) {
  const stripe = getStripe()
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook signature error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const admin = createAdminClient()

  // Log idempotente del evento (deduplicación con (provider, external_id))
  await admin
    .from('webhook_events')
    .insert({
      provider: 'stripe',
      external_id: event.id,
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
    })
    .select()
    .maybeSingle()

  // Procesar eventos relevantes
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const sess = event.data.object as Stripe.Checkout.Session
        const orgId = sess.metadata?.organization_id
        const planCode = sess.metadata?.plan_code
        if (!orgId || !planCode) break

        const { data: plan } = await admin
          .from('plans')
          .select('id')
          .eq('code', planCode)
          .single()
        if (!plan) break

        await admin
          .from('subscriptions')
          .update({
            plan_id: plan.id,
            status: 'active',
            stripe_customer_id: sess.customer as string,
            stripe_subscription_id: sess.subscription as string,
          })
          .eq('organization_id', orgId)
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const orgId = sub.metadata?.organization_id
        if (!orgId) break

        const status = sub.status as
          | 'trialing'
          | 'active'
          | 'past_due'
          | 'canceled'
          | 'unpaid'
          | 'incomplete'

        await admin
          .from('subscriptions')
          .update({
            status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          })
          .eq('organization_id', orgId)
        break
      }
    }

    await admin
      .from('webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('provider', 'stripe')
      .eq('external_id', event.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await admin
      .from('webhook_events')
      .update({ error: message })
      .eq('provider', 'stripe')
      .eq('external_id', event.id)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
