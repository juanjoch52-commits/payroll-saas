'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

// =============================================================================
// Server Actions — Scheduling (turnos)
// =============================================================================

function isManager(role: string) {
  return ['owner', 'admin', 'manager'].includes(role)
}

export type SchedResult = { success: boolean; error?: string }

const shiftSchema = z.object({
  employeeId: z.string().uuid().optional().or(z.literal('')),
  worksiteId: z.string().uuid().optional().or(z.literal('')),
  startsAt: z.string().min(10),
  endsAt: z.string().min(10),
  roleLabel: z.string().max(60).optional(),
  breakMinutes: z.coerce.number().int().min(0).default(0),
  notes: z.string().max(500).optional(),
})

export async function createShift(input: z.input<typeof shiftSchema>): Promise<SchedResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const parsed = shiftSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data
  if (new Date(d.endsAt) <= new Date(d.startsAt)) {
    return { success: false, error: 'El fin debe ser después del inicio.' }
  }

  const supabase = createClient()
  const { error } = await supabase.from('shifts').insert({
    organization_id: session.organizationId,
    employee_id: d.employeeId || null,
    worksite_id: d.worksiteId || null,
    starts_at: d.startsAt,
    ends_at: d.endsAt,
    role_label: d.roleLabel || null,
    break_minutes: d.breakMinutes,
    notes: d.notes || null,
    status: d.employeeId ? 'draft' : 'open',
    created_by: session.userId,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/schedule', 'page')
  return { success: true }
}

export async function deleteShift(shiftId: string): Promise<SchedResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', shiftId)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/schedule', 'page')
  return { success: true }
}

/** Publica todos los borradores de la semana [weekStart, weekStart+7) y avisa. */
export async function publishWeek(weekStartISO: string): Promise<SchedResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }

  const start = new Date(weekStartISO)
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
  const supabase = createClient()

  const { data: published, error } = await supabase
    .from('shifts')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('organization_id', session.organizationId)
    .eq('status', 'draft')
    .gte('starts_at', start.toISOString())
    .lt('starts_at', end.toISOString())
    .select('employee_id')

  if (error) return { success: false, error: error.message }

  // Notificación best-effort a los empleados con turno publicado.
  try {
    const empIds = [
      ...new Set((published ?? []).map((s: { employee_id: string | null }) => s.employee_id).filter(Boolean)),
    ] as string[]
    if (empIds.length > 0) {
      const admin = createAdminClient()
      const { data: emps } = await admin
        .from('employees')
        .select('user_id')
        .in('id', empIds)
        .not('user_id', 'is', null)
      const { dispatch } = await import('@/lib/notifications/dispatch')
      for (const e of (emps ?? []) as { user_id: string }[]) {
        await dispatch({
          userId: e.user_id,
          type: 'schedule_published',
          title: 'Nuevo horario publicado',
          body: 'Tu horario de la semana ya está disponible.',
          dedupeKey: `sched-${weekStartISO}-${e.user_id}`,
        }).catch(() => {})
      }
    }
  } catch {
    /* notificación no crítica */
  }

  revalidatePath('/(app)/schedule', 'page')
  return { success: true }
}

/** Empleado reclama un turno abierto (vía service role, validado). */
export async function claimOpenShift(shiftId: string): Promise<SchedResult> {
  const session = await requireSession('/en/login')
  const supabase = createClient()
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!emp) return { success: false, error: 'No eres empleado de esta organización.' }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { success: false, error: 'Servidor sin configurar.' }
  }
  const { error } = await admin
    .from('shifts')
    .update({
      employee_id: (emp as { id: string }).id,
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', shiftId)
    .eq('organization_id', session.organizationId)
    .eq('status', 'open')
  if (error) return { success: false, error: error.message }
  revalidatePath('/(employee)', 'layout')
  revalidatePath('/(app)/schedule', 'page')
  return { success: true }
}

/** Empleado pide ceder su turno (giveaway). */
export async function requestSwap(
  shiftId: string,
  note?: string,
): Promise<SchedResult> {
  const session = await requireSession('/en/login')
  const supabase = createClient()
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!emp) return { success: false, error: 'No autorizado.' }

  const { error } = await supabase.from('shift_swaps').insert({
    organization_id: session.organizationId,
    shift_id: shiftId,
    requested_by: (emp as { id: string }).id,
    kind: 'giveaway',
    status: 'requested',
    note: note ?? null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/(employee)', 'layout')
  return { success: true }
}

/** Manager aprueba/rechaza un swap. Al aprobar un giveaway, libera el turno (open). */
export async function respondSwap(swapId: string, approve: boolean): Promise<SchedResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()

  const { data: swap } = await supabase
    .from('shift_swaps')
    .select('id, shift_id, kind')
    .eq('id', swapId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!swap) return { success: false, error: 'Solicitud no encontrada.' }

  const { error } = await supabase
    .from('shift_swaps')
    .update({
      status: approve ? 'approved' : 'rejected',
      decided_by: session.userId,
      decided_at: new Date().toISOString(),
    })
    .eq('id', swapId)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }

  if (approve && (swap as { kind: string }).kind === 'giveaway') {
    await supabase
      .from('shifts')
      .update({ employee_id: null, status: 'open' })
      .eq('id', (swap as { shift_id: string }).shift_id)
      .eq('organization_id', session.organizationId)
  }

  revalidatePath('/(app)/schedule', 'page')
  return { success: true }
}
