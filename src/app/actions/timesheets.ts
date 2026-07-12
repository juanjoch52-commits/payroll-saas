'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { dayStartUtc } from '@/lib/time/tz'
import { addDays, summarizeWeek, formatMinutes } from '@/lib/timesheets/week'
import {
  orgTimezone,
  fetchWeekEntriesRaw,
  toWeekEntries,
  submitWeekCore,
} from '@/lib/timesheets/core'

// =============================================================================
// Server Actions — Cierre de semana / solicitud de pago (timesheets)
// =============================================================================
// La lógica del empleado vive en src/lib/timesheets/core.ts (compartida con
// /api/v1 de la app móvil). Aquí: resolución de sesión web + acciones del
// MANAGER (aprobar/devolver semana completa).
// =============================================================================

export type TimesheetResult = { success: boolean; error?: string }

async function currentEmployee(): Promise<
  | { ok: true; ctx: { employeeId: string; organizationId: string; userId: string }; active: boolean }
  | { ok: false; error: string }
> {
  const session = await requireSession('/en/login')
  const supabase = createClient()
  const { data: employee } = await supabase
    .from('employees')
    .select('id, status')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!employee) return { ok: false, error: 'No estás registrado como empleado en esta organización.' }
  return {
    ok: true,
    ctx: {
      employeeId: (employee as { id: string }).id,
      organizationId: session.organizationId,
      userId: session.userId,
    },
    active: (employee as { status: string }).status === 'active',
  }
}

// -----------------------------------------------------------------------------

const submitSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional().or(z.literal('')),
})

/**
 * Empleado cierra la semana y pide su pago.
 * Re-someter una semana devuelta (rejected) actualiza la misma fila.
 */
export async function submitWeek(input: z.input<typeof submitSchema>): Promise<TimesheetResult> {
  const parsed = submitSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const emp = await currentEmployee()
  if (!emp.ok) return { success: false, error: emp.error }
  if (!emp.active) return { success: false, error: 'Tu cuenta de empleado no está activa.' }

  const supabase = createClient()
  const res = await submitWeekCore(supabase, emp.ctx, parsed.data.weekStart, parsed.data.note || undefined)
  if (!res.ok) return { success: false, error: res.error }

  revalidatePath('/(employee)', 'layout')
  revalidatePath('/(app)/time-tracking', 'page')
  return { success: true }
}

// -----------------------------------------------------------------------------

/**
 * Manager aprueba la semana completa: todas las entries pending/edited del
 * rango pasan a 'approved' (payroll las consume) y la submission a 'approved'.
 */
export async function approveTimesheetWeek(submissionId: string): Promise<TimesheetResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return { success: false, error: 'No tienes permiso para aprobar.' }
  }

  const supabase = createClient()
  const { data: sub } = await supabase
    .from('timesheet_submissions')
    .select('id, employee_id, week_start, status, employees!inner(user_id, first_name, last_name)')
    .eq('id', submissionId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()

  if (!sub) return { success: false, error: 'Solicitud no encontrada.' }
  const subRow = sub as unknown as {
    id: string
    employee_id: string
    week_start: string
    status: string
    employees: { user_id: string | null; first_name: string; last_name: string }
  }
  if (subRow.status !== 'submitted') {
    return { success: false, error: 'Esta semana ya fue revisada.' }
  }

  const tz = await orgTimezone(supabase, session.organizationId)
  const fromUtc = dayStartUtc(subRow.week_start, tz)
  const toUtc = dayStartUtc(addDays(subRow.week_start, 7), tz)
  const now = new Date().toISOString()

  // 1) Aprobar en bloque las entries pendientes/editadas de la semana.
  const { error: entriesErr } = await supabase
    .from('time_entries')
    .update({ status: 'approved', reviewed_by: session.userId, reviewed_at: now })
    .eq('employee_id', subRow.employee_id)
    .eq('organization_id', session.organizationId)
    .gte('clock_in_at', fromUtc)
    .lt('clock_in_at', toUtc)
    .in('status', ['pending', 'edited'])
  if (entriesErr) return { success: false, error: entriesErr.message }

  // 2) Refrescar snapshot con lo realmente aprobado (el manager pudo editar horas).
  const rows = await fetchWeekEntriesRaw(
    supabase,
    { employeeId: subRow.employee_id, organizationId: session.organizationId },
    subRow.week_start,
    tz,
  )
  const summary = summarizeWeek(toWeekEntries(rows), subRow.week_start, tz)

  const { error: subErr } = await supabase
    .from('timesheet_submissions')
    .update({
      status: 'approved',
      total_minutes: summary.approvedMinutes,
      entry_count: summary.entryCount,
      reviewed_by: session.userId,
      reviewed_at: now,
    })
    .eq('id', subRow.id)
    .eq('organization_id', session.organizationId)
  if (subErr) return { success: false, error: subErr.message }

  // Aviso al empleado (best-effort).
  if (subRow.employees.user_id) {
    try {
      const { dispatch } = await import('@/lib/notifications/dispatch')
      await dispatch({
        userId: subRow.employees.user_id,
        organizationId: session.organizationId,
        type: 'timesheet_decision',
        title: 'Semana aprobada',
        body: `Tu semana del ${subRow.week_start} fue aprobada (${formatMinutes(summary.approvedMinutes)}). Entrará en la próxima nómina.`,
        dedupeKey: `tsheet-dec-${subRow.id}-${now}`,
        cta: { label: 'Ver mis horas', url: '/history' },
        emailTemplateData: {
          weekStart: subRow.week_start,
          approved: true,
          minutesLabel: formatMinutes(summary.approvedMinutes),
        },
      }).catch(() => {})
    } catch {
      /* no crítico */
    }
  }

  try {
    const { dispatchWebhook } = await import('@/lib/webhooks/dispatch')
    await dispatchWebhook(session.organizationId, 'timesheet.approved', {
      submissionId: subRow.id,
      employeeId: subRow.employee_id,
      weekStart: subRow.week_start,
      approvedMinutes: summary.approvedMinutes,
    })
  } catch {
    /* no crítico */
  }

  revalidatePath('/(app)/time-tracking', 'page')
  revalidatePath('/(employee)', 'layout')
  return { success: true }
}

// -----------------------------------------------------------------------------

/**
 * Manager devuelve la semana con nota. Las entries NO cambian: el empleado
 * corrige lo necesario y re-somete.
 */
export async function rejectTimesheetWeek(
  submissionId: string,
  note: string,
): Promise<TimesheetResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return { success: false, error: 'No tienes permiso para rechazar.' }
  }
  const trimmed = note.trim()
  if (!trimmed) return { success: false, error: 'Explica por qué la devuelves.' }

  const supabase = createClient()
  const { data: sub } = await supabase
    .from('timesheet_submissions')
    .select('id, week_start, status, employees!inner(user_id)')
    .eq('id', submissionId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()

  if (!sub) return { success: false, error: 'Solicitud no encontrada.' }
  const subRow = sub as unknown as {
    id: string
    week_start: string
    status: string
    employees: { user_id: string | null }
  }
  if (subRow.status !== 'submitted') {
    return { success: false, error: 'Esta semana ya fue revisada.' }
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('timesheet_submissions')
    .update({
      status: 'rejected',
      review_note: trimmed.slice(0, 500),
      reviewed_by: session.userId,
      reviewed_at: now,
    })
    .eq('id', subRow.id)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }

  if (subRow.employees.user_id) {
    try {
      const { dispatch } = await import('@/lib/notifications/dispatch')
      await dispatch({
        userId: subRow.employees.user_id,
        organizationId: session.organizationId,
        type: 'timesheet_decision',
        title: 'Semana devuelta',
        body: `Tu semana del ${subRow.week_start} fue devuelta: ${trimmed.slice(0, 200)}`,
        dedupeKey: `tsheet-dec-${subRow.id}-${now}`,
        cta: { label: 'Corregir mi semana', url: '/history' },
        emailTemplateData: {
          weekStart: subRow.week_start,
          approved: false,
          note: trimmed.slice(0, 300),
        },
      }).catch(() => {})
    } catch {
      /* no crítico */
    }
  }

  revalidatePath('/(app)/time-tracking', 'page')
  revalidatePath('/(employee)', 'layout')
  return { success: true }
}
