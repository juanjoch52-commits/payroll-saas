import { createClient } from '@/lib/supabase/server'

/**
 * Verifica si una feature está habilitada para la org activa.
 *
 * Las features están definidas en `plans.features` (jsonb). Ver
 * migración `20260101000004_plans.sql` para la lista completa.
 *
 * Llamar SIEMPRE desde Server Actions críticas, p.ej:
 *
 *   if (!(await checkFeature(orgId, 'tax_forms'))) {
 *     throw new Error('Tu plan no incluye reportes fiscales.')
 *   }
 */
export async function checkFeature(
  organizationId: string,
  featureKey: string,
): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase.rpc('check_plan_feature', {
    org_id: organizationId,
    feature_key: featureKey,
  })
  return Boolean(data)
}
