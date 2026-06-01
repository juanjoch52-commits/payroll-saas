'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

// =============================================================================
// Server Actions — Production entries (pago por producción / a destajo)
// =============================================================================
// Paralelo a time-tracking: el manager registra cantidades producidas por
// empleado, las aprueba, y al calcular una payroll run las entries aprobadas
// se agregan automáticamente para los empleados con scheme 'piecerate'.
// =============================================================================

function isManager(role: string) {
  return ['owner', 'admin', 'manager'].includes(role)
}

const recordSchema = z.object({
  employeeId: z.string().uuid(),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  unitCode: z.string().min(1).max(60),
  unitLabel: z.string().max(60).optional(),
  quantity: z.coerce.number().min(0),
  ratePerUnitCents: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
})

export type ProductionActionResult = { success: boolean; error?: string }

/** El manager registra una entry de producción (status 'pending'). */
export async function recordProductionEntry(formData: FormData): Promise<ProductionActionResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) {
    return { success: false, error: 'No tienes permiso para registrar producción.' }
  }

  const parsed = recordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const input = parsed.data

  const supabase = createClient()

  // El empleado debe pertenecer a la org (defensa extra además de RLS).
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('id', input.employeeId)
    .eq('organization_id', session.organizationId)
    .single()
  if (!emp) return { success: false, error: 'Empleado no encontrado.' }

  const { error } = await supabase.from('production_entries').insert({
    organization_id: session.organizationId,
    employee_id: input.employeeId,
    recorded_by: session.userId,
    work_date: input.workDate,
    unit_code: input.unitCode,
    unit_label: input.unitLabel || input.unitCode,
    quantity: input.quantity,
    rate_per_unit_cents: input.ratePerUnitCents ?? null,
    status: 'pending',
    notes: input.notes ?? null,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/production', 'page')
  return { success: true }
}

/** El manager aprueba una entry → entra a la siguiente payroll run. */
export async function approveProductionEntry(id: string): Promise<ProductionActionResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('production_entries')
    .update({
      status: 'approved',
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', session.organizationId)
    .in('status', ['pending', 'edited'])

  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/production', 'page')
  return { success: true }
}

/** El manager rechaza una entry (no entra a payroll). */
export async function rejectProductionEntry(id: string, notes?: string): Promise<ProductionActionResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('production_entries')
    .update({
      status: 'rejected',
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes ?? null,
    })
    .eq('id', id)
    .eq('organization_id', session.organizationId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/production', 'page')
  return { success: true }
}

/** Borra una entry de producción (solo admin/owner). */
export async function deleteProductionEntry(id: string): Promise<ProductionActionResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) return { success: false, error: 'No autorizado.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('production_entries')
    .delete()
    .eq('id', id)
    .eq('organization_id', session.organizationId)
    .is('payroll_item_id', null) // no borrar si ya entró a una nómina

  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/production', 'page')
  return { success: true }
}
