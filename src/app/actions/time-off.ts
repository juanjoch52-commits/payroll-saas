'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

// =============================================================================
// Server Actions — Tiempo libre / PTO
// =============================================================================

function isManager(role: string) {
  return ['owner', 'admin', 'manager'].includes(role)
}
function isAdmin(role: string) {
  return ['owner', 'admin'].includes(role)
}

export type PtoResult = { success: boolean; error?: string }

// ---- Políticas (admin) -----------------------------------------------------
const policySchema = z.object({
  name: z.string().min(1).max(60),
  ptoType: z.enum(['vacation', 'sick', 'personal', 'unpaid', 'other']).default('vacation'),
  accrualMethod: z.enum(['none', 'hours_per_period', 'days_per_year']).default('none'),
  accrualRate: z.coerce.number().min(0).default(0),
  maxBalanceHours: z.coerce.number().min(0).optional(),
  paid: z.coerce.boolean().default(true),
})

export async function createPtoPolicy(input: z.input<typeof policySchema>): Promise<PtoResult> {
  const session = await requireSession('/en/login')
  if (!isAdmin(session.role)) return { success: false, error: 'No autorizado.' }
  const parsed = policySchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data
  const supabase = createClient()
  const { error } = await supabase.from('pto_policies').insert({
    organization_id: session.organizationId,
    name: d.name,
    pto_type: d.ptoType,
    accrual_method: d.accrualMethod,
    accrual_rate: d.accrualRate,
    max_balance_hours: d.maxBalanceHours ?? null,
    paid: d.paid,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/time-off', 'page')
  return { success: true }
}

export async function deletePtoPolicy(id: string): Promise<PtoResult> {
  const session = await requireSession('/en/login')
  if (!isAdmin(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()
  const { error } = await supabase
    .from('pto_policies')
    .update({ is_active: false })
    .eq('id', id)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/time-off', 'page')
  return { success: true }
}

export async function adjustPtoBalance(
  employeeId: string,
  policyId: string,
  balanceHours: number,
): Promise<PtoResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()
  const { error } = await supabase.from('pto_balances').upsert(
    {
      organization_id: session.organizationId,
      employee_id: employeeId,
      policy_id: policyId,
      balance_hours: balanceHours,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id,policy_id' },
  )
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/time-off', 'page')
  return { success: true }
}

// ---- Solicitudes -----------------------------------------------------------
const requestSchema = z.object({
  policyId: z.string().uuid().optional().or(z.literal('')),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.coerce.number().min(0),
  reason: z.string().max(500).optional(),
})

export async function requestTimeOff(input: z.input<typeof requestSchema>): Promise<PtoResult> {
  const session = await requireSession('/en/login')
  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data
  const supabase = createClient()

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!emp) return { success: false, error: 'No autorizado.' }

  const { error } = await supabase.from('time_off_requests').insert({
    organization_id: session.organizationId,
    employee_id: (emp as { id: string }).id,
    policy_id: d.policyId || null,
    start_date: d.startDate,
    end_date: d.endDate,
    hours: d.hours,
    reason: d.reason || null,
    status: 'pending',
  })
  if (error) return { success: false, error: error.message }

  // Avisa al owner (best-effort).
  try {
    const admin = createAdminClient()
    const { data: org } = await admin
      .from('organizations')
      .select('owner_user_id')
      .eq('id', session.organizationId)
      .maybeSingle()
    const ownerId = (org as { owner_user_id: string } | null)?.owner_user_id
    if (ownerId) {
      const { dispatch } = await import('@/lib/notifications/dispatch')
      await dispatch({
        userId: ownerId,
        type: 'time_off_request',
        title: 'Nueva solicitud de tiempo libre',
        body: `${d.startDate} → ${d.endDate} (${d.hours}h)`,
      }).catch(() => {})
    }
  } catch {
    /* no crítico */
  }

  revalidatePath('/(employee)', 'layout')
  return { success: true }
}

export async function cancelTimeOff(id: string): Promise<PtoResult> {
  const session = await requireSession('/en/login')
  const supabase = createClient()
  const { error } = await supabase
    .from('time_off_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('organization_id', session.organizationId)
    .eq('status', 'pending')
  if (error) return { success: false, error: error.message }
  revalidatePath('/(employee)', 'layout')
  return { success: true }
}

export async function respondTimeOff(
  requestId: string,
  approve: boolean,
  notes?: string,
): Promise<PtoResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()

  const { data: req } = await supabase
    .from('time_off_requests')
    .select('id, employee_id, policy_id, hours')
    .eq('id', requestId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!req) return { success: false, error: 'Solicitud no encontrada.' }
  const r = req as { id: string; employee_id: string; policy_id: string | null; hours: number }

  const { error } = await supabase
    .from('time_off_requests')
    .update({
      status: approve ? 'approved' : 'rejected',
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes ?? null,
    })
    .eq('id', requestId)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }

  // Al aprobar una política pagada, descuenta del saldo.
  if (approve && r.policy_id) {
    const { data: pol } = await supabase
      .from('pto_policies')
      .select('paid')
      .eq('id', r.policy_id)
      .maybeSingle()
    if ((pol as { paid: boolean } | null)?.paid) {
      const { data: bal } = await supabase
        .from('pto_balances')
        .select('balance_hours')
        .eq('employee_id', r.employee_id)
        .eq('policy_id', r.policy_id)
        .maybeSingle()
      const current = Number((bal as { balance_hours: number } | null)?.balance_hours ?? 0)
      await supabase.from('pto_balances').upsert(
        {
          organization_id: session.organizationId,
          employee_id: r.employee_id,
          policy_id: r.policy_id,
          balance_hours: current - r.hours,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id,policy_id' },
      )
    }
  }

  // Avisa al empleado.
  try {
    const admin = createAdminClient()
    const { data: emp } = await admin
      .from('employees')
      .select('user_id')
      .eq('id', r.employee_id)
      .maybeSingle()
    const uid = (emp as { user_id: string | null } | null)?.user_id
    if (uid) {
      const { dispatch } = await import('@/lib/notifications/dispatch')
      await dispatch({
        userId: uid,
        type: 'time_off_decision',
        title: approve ? 'Tiempo libre aprobado' : 'Tiempo libre rechazado',
        body: approve ? 'Tu solicitud fue aprobada.' : 'Tu solicitud fue rechazada.',
      }).catch(() => {})
    }
  } catch {
    /* no crítico */
  }

  revalidatePath('/(app)/time-off', 'page')
  return { success: true }
}
