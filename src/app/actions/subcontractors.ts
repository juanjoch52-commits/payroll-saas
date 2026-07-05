'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

// =============================================================================
// Server Actions — Subcontratistas (jerárquicos)
// =============================================================================

export type SubResult = { success: boolean; error?: string }

const subSchema = z.object({
  name: z.string().min(2, 'Nombre muy corto.').max(120),
  parentId: z.string().uuid().optional().or(z.literal('')),
  contactName: z.string().max(120).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
})

function isManager(role: string) {
  return ['owner', 'admin', 'manager'].includes(role)
}

/** El parent propuesto no puede ser el propio sub ni un descendiente (ciclo). */
async function wouldCycle(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  subId: string,
  parentId: string,
): Promise<boolean> {
  if (subId === parentId) return true
  const { data: subs } = await supabase
    .from('subcontractors')
    .select('id, parent_id')
    .eq('organization_id', orgId)
  const byId = new Map((subs ?? []).map((s: { id: string; parent_id: string | null }) => [s.id, s]))
  let cur = byId.get(parentId)
  let hops = 0
  while (cur && cur.parent_id && hops < 20) {
    if (cur.parent_id === subId) return true
    cur = byId.get(cur.parent_id)
    hops++
  }
  return false
}

export async function createSubcontractor(input: z.input<typeof subSchema>): Promise<SubResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const parsed = subSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = createClient()
  const { error } = await supabase.from('subcontractors').insert({
    organization_id: session.organizationId,
    name: d.name,
    parent_id: d.parentId || null,
    contact_name: d.contactName || null,
    email: d.email || null,
    phone: d.phone || null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/subcontractors', 'page')
  return { success: true }
}

export async function updateSubcontractor(
  id: string,
  input: z.input<typeof subSchema>,
): Promise<SubResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const parsed = subSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = createClient()
  if (d.parentId && (await wouldCycle(supabase, session.organizationId, id, d.parentId))) {
    return { success: false, error: 'Ese padre crearía un ciclo en la jerarquía.' }
  }

  const { error } = await supabase
    .from('subcontractors')
    .update({
      name: d.name,
      parent_id: d.parentId || null,
      contact_name: d.contactName || null,
      email: d.email || null,
      phone: d.phone || null,
    })
    .eq('id', id)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/subcontractors', 'page')
  return { success: true }
}

export async function toggleSubcontractor(id: string, isActive: boolean): Promise<SubResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()
  const { error } = await supabase
    .from('subcontractors')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/subcontractors', 'page')
  return { success: true }
}
