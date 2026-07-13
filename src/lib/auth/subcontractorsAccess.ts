import { cache } from 'react'

import { checkFeature } from '@/lib/auth/checkFeature'
import { getSubscriptionGate } from '@/lib/auth/subscription'

/**
 * ¿Puede esta org usar el módulo de contratistas/subcontratistas?
 *
 * Reglas (decisión 2026-07-12 — el módulo se vende como Premium):
 *   - Trial ACTIVO → sí, completo. El signup pregunta "¿pagas a
 *     subcontratistas?" y la org nace con el flag: los 30 días de prueba
 *     deben poder mostrar la feature estrella.
 *   - Pagando (o trial vencido) → requiere plan con feature `subcontractors`
 *     (Premium) o un feature_override concedido desde /admin
 *     (check_plan_feature ya los respeta).
 *
 * OJO: esto NO toca el motor de nómina ni el portal del contratista —
 * liquidaciones/records existentes siguen leyéndose. El candado aplica a
 * GESTIONAR el módulo (página, altas/ediciones, toggle).
 */
export const hasSubcontractorsAccess = cache(
  async (organizationId: string): Promise<boolean> => {
    const gate = await getSubscriptionGate(organizationId)
    if (gate.status === 'trialing' && gate.ok) return true
    return checkFeature(organizationId, 'subcontractors')
  },
)

/**
 * Para Server Actions de escritura del módulo:
 *   const lockErr = await requireSubcontractorsAccess(session.organizationId)
 *   if (lockErr) return lockErr
 */
export async function requireSubcontractorsAccess(
  organizationId: string,
): Promise<{ success: false; error: string } | null> {
  if (await hasSubcontractorsAccess(organizationId)) return null
  return {
    success: false,
    error:
      'El módulo de contratistas es del plan Premium. Actualiza tu plan en Billing para usarlo.',
  }
}
