import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Gate de suscripción (trial enforcement)
// =============================================================================
// Reglas:
//   - active / trialing (con días restantes)  → ok
//   - past_due                                 → ok (gracia de Stripe) + warning
//   - trialing vencido / canceled / unpaid /
//     incomplete                               → BLOQUEA escrituras core
//   - sin fila de subscription                 → ok (fail-open; el trigger de
//     signup siempre crea una — no rompemos cuentas raras/legacy)
// La lectura NUNCA se bloquea: el tenant siempre puede entrar, ver sus datos,
// exportar y pagar en /billing.
// =============================================================================

export type SubscriptionGate = {
  ok: boolean
  status: string | null
  trialDaysLeft: number | null
  reason: 'trial_expired' | 'canceled' | 'unpaid' | null
}

export const getSubscriptionGate = cache(
  async (organizationId: string): Promise<SubscriptionGate> => {
    const supabase = createClient()
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, trial_ends_at')
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (!sub) return { ok: true, status: null, trialDaysLeft: null, reason: null }

    const s = sub as { status: string; trial_ends_at: string | null }

    if (s.status === 'trialing') {
      const endsAt = s.trial_ends_at ? new Date(s.trial_ends_at).getTime() : 0
      const msLeft = endsAt - Date.now()
      const daysLeft = Math.ceil(msLeft / 86_400_000)
      if (msLeft <= 0) {
        return { ok: false, status: s.status, trialDaysLeft: 0, reason: 'trial_expired' }
      }
      return { ok: true, status: s.status, trialDaysLeft: daysLeft, reason: null }
    }

    if (s.status === 'active' || s.status === 'past_due') {
      return { ok: true, status: s.status, trialDaysLeft: null, reason: null }
    }

    // canceled / unpaid / incomplete
    return {
      ok: false,
      status: s.status,
      trialDaysLeft: null,
      reason: s.status === 'canceled' ? 'canceled' : 'unpaid',
    }
  },
)

/**
 * Para usar al inicio de Server Actions de escritura core:
 *   const gate = await requireActiveSubscription(session.organizationId)
 *   if (gate) return gate   // { success: false, error }
 */
export async function requireActiveSubscription(
  organizationId: string,
): Promise<{ success: false; error: string } | null> {
  const gate = await getSubscriptionGate(organizationId)
  if (gate.ok) return null
  return {
    success: false,
    error:
      gate.reason === 'trial_expired'
        ? 'Tu período de prueba terminó. Elige un plan en Billing para continuar.'
        : 'Tu suscripción no está activa. Actualiza tu plan en Billing para continuar.',
  }
}
