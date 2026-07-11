import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSession, type ActiveSession } from '@/lib/auth/session'

// =============================================================================
// Sesión del portal del contratista
// =============================================================================
// El contratista es un member con role='contractor' vinculado a UNA fila de
// subcontractors (user_id) en su org. Sus páginas leen vía service role
// SIEMPRE scoped a su subtree — el RLS normal no le da acceso a nada más.
// =============================================================================

export type ContractorSub = {
  id: string
  name: string
  sales_tax_pct: number
}

export const requireContractor = cache(
  async (
    locale: string,
  ): Promise<{ session: ActiveSession; sub: ContractorSub | null }> => {
    const session = await requireSession(`/${locale}/login`)
    if (session.role !== 'contractor') {
      redirect(`/${locale}/dashboard`)
    }
    const admin = createAdminClient()
    const { data } = await admin
      .from('subcontractors')
      .select('id, name, sales_tax_pct')
      .eq('organization_id', session.organizationId)
      .eq('user_id', session.userId)
      .maybeSingle()
    return { session, sub: (data as ContractorSub | null) ?? null }
  },
)

/** Ids del subtree del contratista (él + sus subs anidados). */
export async function contractorSubtreeIds(
  organizationId: string,
  rootId: string,
): Promise<{ subtreeIds: string[]; subNameById: Map<string, string> }> {
  const admin = createAdminClient()
  const { data: allSubs } = await admin
    .from('subcontractors')
    .select('id, parent_id, name')
    .eq('organization_id', organizationId)

  const subs = (allSubs ?? []) as { id: string; parent_id: string | null; name: string }[]
  const { rootOf } = await import('@/lib/subcontractors/tree')
  const byId = new Map(subs.map((s) => [s.id, s]))
  const subtreeIds = subs.filter((s) => rootOf(s.id, byId)?.id === rootId).map((s) => s.id)
  return { subtreeIds, subNameById: new Map(subs.map((s) => [s.id, s.name])) }
}
