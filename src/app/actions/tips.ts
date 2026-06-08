'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

// =============================================================================
// Server Actions — Propinas (tips)
// =============================================================================

function isManager(role: string) {
  return ['owner', 'admin', 'manager'].includes(role)
}

export type TipResult = { success: boolean; error?: string }

const recordSchema = z.object({
  employeeId: z.string().uuid(),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountCents: z.coerce.number().int().min(0),
  source: z.enum(['cash', 'card', 'pool', 'declared']).default('card'),
})

export async function recordTip(input: z.input<typeof recordSchema>): Promise<TipResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const parsed = recordSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data
  const supabase = createClient()
  const { error } = await supabase.from('tip_entries').insert({
    organization_id: session.organizationId,
    employee_id: d.employeeId,
    work_date: d.workDate,
    amount_cents: d.amountCents,
    source: d.source,
    status: 'pending',
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/tips', 'page')
  return { success: true }
}

export async function approveTip(id: string): Promise<TipResult> {
  return setTipStatus(id, 'approved')
}
export async function rejectTip(id: string): Promise<TipResult> {
  return setTipStatus(id, 'rejected')
}

async function setTipStatus(id: string, status: 'approved' | 'rejected'): Promise<TipResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()
  const { error } = await supabase
    .from('tip_entries')
    .update({ status, reviewed_by: session.userId, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/tips', 'page')
  return { success: true }
}

export async function deleteTip(id: string): Promise<TipResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()
  const { error } = await supabase
    .from('tip_entries')
    .delete()
    .eq('id', id)
    .eq('organization_id', session.organizationId)
    .is('payroll_item_id', null)
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/tips', 'page')
  return { success: true }
}

// ---- Tip pooling: distribuir un pool entre empleados ------------------------
const distributeSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalCents: z.coerce.number().int().min(1),
  method: z.enum(['hours', 'equal']).default('hours'),
  employeeIds: z.array(z.string().uuid()).min(1),
})

export async function distributeTipPool(input: z.input<typeof distributeSchema>): Promise<TipResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const parsed = distributeSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const { workDate, totalCents, method, employeeIds } = parsed.data
  const supabase = createClient()

  // Pesos: por horas trabajadas ese día, o iguales.
  const weights = new Map<string, number>()
  if (method === 'hours') {
    const { data: entries } = await supabase
      .from('time_entries')
      .select('employee_id, billable_minutes')
      .in('employee_id', employeeIds)
      .eq('organization_id', session.organizationId)
      .gte('clock_in_at', `${workDate}T00:00:00Z`)
      .lte('clock_in_at', `${workDate}T23:59:59Z`)
    for (const e of (entries ?? []) as { employee_id: string; billable_minutes: number | null }[]) {
      weights.set(e.employee_id, (weights.get(e.employee_id) ?? 0) + (e.billable_minutes ?? 0))
    }
  }
  // Si no hay horas (o método equal), pesos iguales.
  const totalWeight = [...weights.values()].reduce((a, b) => a + b, 0)
  if (method === 'equal' || totalWeight === 0) {
    weights.clear()
    for (const id of employeeIds) weights.set(id, 1)
  }
  const sumW = [...weights.values()].reduce((a, b) => a + b, 0)

  // Reparte con remainder al primero para que cuadre exacto.
  const rows: { employee_id: string; amount_cents: number }[] = []
  let allocated = 0
  const ids = [...weights.keys()]
  ids.forEach((id, i) => {
    let share = i === ids.length - 1 ? totalCents - allocated : Math.round((totalCents * (weights.get(id) ?? 0)) / sumW)
    if (share < 0) share = 0
    allocated += share
    rows.push({ employee_id: id, amount_cents: share })
  })

  const { error } = await supabase.from('tip_entries').insert(
    rows.map((r) => ({
      organization_id: session.organizationId,
      employee_id: r.employee_id,
      work_date: workDate,
      amount_cents: r.amount_cents,
      source: 'pool' as const,
      status: 'approved' as const,
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
    })),
  )
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/tips', 'page')
  return { success: true }
}
