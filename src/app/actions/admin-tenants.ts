'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/platform'

// =============================================================================
// Server Actions — Platform admin: control de suscripciones por tenant
// =============================================================================
// Solo platform_admins. Escriben con service role. Cada cambio deja una fila
// en audit_logs (action 'admin.subscription.*') con el actor y el estado nuevo.
//
// OJO: estas acciones NO tocan Stripe — son el bisturí manual pre/post-Stripe
// (extender un trial, comp de un plan, suspender un moroso). Si la org tiene
// stripe_subscription_id, el webhook de Stripe puede sobreescribir el estado
// en el próximo evento; para cuentas pagas usar el flujo normal de Billing.
// =============================================================================

export type AdminSubResult = { success: boolean; error?: string }

async function audit(
  orgId: string,
  actorUserId: string,
  action: string,
  targetId: string | null,
  newData: Record<string, unknown>,
) {
  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    organization_id: orgId,
    actor_user_id: actorUserId,
    action,
    target_table: 'subscriptions',
    target_id: targetId,
    new_data: newData,
  })
}

/**
 * Fija la fecha de fin de trial (extender o acortar) y devuelve la org a
 * status 'trialing'. Útil para dar más días a un prospecto o revivir una
 * cuenta vencida sin pasar por Stripe.
 */
export async function adminSetTrialEnd(
  organizationId: string,
  trialEndsAtISO: string,
): Promise<AdminSubResult> {
  const session = await requirePlatformAdmin('en')

  const parsed = z.string().date().or(z.string().datetime()).safeParse(trialEndsAtISO)
  if (!parsed.success) return { success: false, error: 'Invalid date.' }
  const endsAt = new Date(trialEndsAtISO)

  const admin = createAdminClient()
  const { data: sub, error } = await admin
    .from('subscriptions')
    .update({ trial_ends_at: endsAt.toISOString(), status: 'trialing' })
    .eq('organization_id', organizationId)
    .select('id')
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  if (!sub) return { success: false, error: 'No subscription row for this org.' }

  await audit(organizationId, session.userId, 'admin.subscription.trial_set', sub.id, {
    trial_ends_at: endsAt.toISOString(),
  })
  revalidatePath('/[locale]/admin/tenants/[id]', 'page')
  return { success: true }
}

/** Cambia el plan (comp manual). No toca Stripe — ver nota del módulo. */
export async function adminSetPlan(
  organizationId: string,
  planCode: string,
): Promise<AdminSubResult> {
  const session = await requirePlatformAdmin('en')

  if (!/^[a-z_]{2,40}$/.test(planCode)) return { success: false, error: 'Invalid plan code.' }

  const admin = createAdminClient()
  const { data: plan } = await admin
    .from('plans')
    .select('id, code')
    .eq('code', planCode)
    .maybeSingle()
  if (!plan) return { success: false, error: `Unknown plan '${planCode}'.` }

  const { data: sub, error } = await admin
    .from('subscriptions')
    .update({ plan_id: plan.id })
    .eq('organization_id', organizationId)
    .select('id')
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  if (!sub) return { success: false, error: 'No subscription row for this org.' }

  await audit(organizationId, session.userId, 'admin.subscription.plan_set', sub.id, {
    plan_code: plan.code,
  })
  revalidatePath('/[locale]/admin/tenants/[id]', 'page')
  return { success: true }
}

/**
 * Suspende (status 'canceled' → el gate bloquea escrituras core; el tenant
 * puede entrar, leer y pagar) o reactiva (status 'active') una org.
 */
export async function adminSetSuspended(
  organizationId: string,
  suspend: boolean,
): Promise<AdminSubResult> {
  const session = await requirePlatformAdmin('en')

  const admin = createAdminClient()
  const { data: sub, error } = await admin
    .from('subscriptions')
    .update(
      suspend
        ? { status: 'canceled', canceled_at: new Date().toISOString() }
        : { status: 'active', canceled_at: null },
    )
    .eq('organization_id', organizationId)
    .select('id')
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  if (!sub) return { success: false, error: 'No subscription row for this org.' }

  await audit(
    organizationId,
    session.userId,
    suspend ? 'admin.subscription.suspend' : 'admin.subscription.reactivate',
    sub.id,
    { status: suspend ? 'canceled' : 'active' },
  )
  revalidatePath('/[locale]/admin/tenants/[id]', 'page')
  return { success: true }
}
