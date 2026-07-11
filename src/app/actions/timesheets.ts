'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { dayStartUtc, todayInTz } from '@/lib/time/tz'
import {
  addDays,
  isMondayKey,
  summarizeWeek,
  canSubmitWeek,
  formatMinutes,
  type WeekEntry,
  type ExistingSubmissionStatus,
} from '@/lib/timesheets/week'

// =============================================================================
// Server Actions — Cierre de semana / solicitud de pago (timesheets)
// =============================================================================
// Empleado: cierra su semana (lunes-domingo, tz de la org) → snapshot de horas
// en timesheet_submissions + aviso a los managers.
// Manager: aprueba la semana completa (aprueba en bloque las time_entries
// pending/edited del rango — payroll ya consume entries 'approved') o la
// devuelve con nota para corrección y re-envío.
// =============================================================================

export type TimesheetResult = { success: boolean; error?: string }

/** Timezone de la org (fallback igual que payroll). */
async function orgTimezone(orgId: string): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase
    .from('organizations')
    .select('timezone')
    .eq('id', orgId)
    .maybeSingle()
  return (data as { timezone?: string } | null)?.timezone || 'America/New_York'
}

/** Entries del empleado cuya entrada cae en la semana local [weekStart, +7). */
async function fetchWeekEntries(
  employeeId: string,
  orgId: string,
  weekStart: string,
  tz: string,
): Promise<WeekEntry[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('time_entries')
    .select('id, clock_in_at, clock_out_at, billable_minutes, status')
    .eq('employee_id', employeeId)
    .eq('organization_id', orgId)
    .gte('clock_in_at', dayStartUtc(weekStart, tz))
    .lt('clock_in_at', dayStartUtc(addDays(weekStart, 7), tz))

  type Row = {
    id: string
    clock_in_at: string
    clock_out_at: string | null
    billable_minutes: number | null
    status: WeekEntry['status']
  }
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    clockInAt: r.clock_in_at,
    clockOutAt: r.clock_out_at,
    billableMinutes: r.billable_minutes,
    status: r.status,
  }))
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
  const { weekStart } = parsed.data
  if (!isMondayKey(weekStart)) {
    return { success: false, error: 'La semana debe empezar en lunes.' }
  }

  const session = await requireSession('/en/login')
  const supabase = createClient()

  const { data: employee } = await supabase
    .from('employees')
    .select('id, first_name, last_name, status')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()

  if (!employee) {
    return { success: false, error: 'No estás registrado como empleado en esta organización.' }
  }
  if ((employee as { status: string }).status !== 'active') {
    return { success: false, error: 'Tu cuenta de empleado no está activa.' }
  }
  const emp = employee as { id: string; first_name: string; last_name: string }

  const tz = await orgTimezone(session.organizationId)
  const entries = await fetchWeekEntries(emp.id, session.organizationId, weekStart, tz)
  const summary = summarizeWeek(entries, weekStart, tz)

  const { data: existing } = await supabase
    .from('timesheet_submissions')
    .select('id, status')
    .eq('employee_id', emp.id)
    .eq('week_start', weekStart)
    .maybeSingle()
  const existingRow = existing as { id: string; status: ExistingSubmissionStatus } | null

  const gate = canSubmitWeek(summary, existingRow?.status ?? null, todayInTz(tz))
  if (!gate.ok) {
    const reasons: Record<string, string> = {
      future_week: 'No puedes cerrar una semana futura.',
      open_entry: 'Tienes un turno abierto en esa semana. Haz clock out primero.',
      no_hours: 'No hay horas para someter en esa semana.',
      already_submitted: 'Esa semana ya fue enviada y está en revisión.',
      already_approved: 'Esa semana ya fue aprobada.',
    }
    return { success: false, error: reasons[gate.reason ?? 'no_hours'] }
  }

  const payload = {
    week_end: summary.weekEnd,
    total_minutes: summary.totalMinutes,
    entry_count: summary.entryCount,
    employee_note: parsed.data.note || null,
    status: 'submitted' as const,
    submitted_at: new Date().toISOString(),
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
  }

  let submissionId: string
  if (existingRow) {
    // Semana devuelta → re-someter la misma fila (RLS: rejected → submitted).
    const { error } = await supabase
      .from('timesheet_submissions')
      .update(payload)
      .eq('id', existingRow.id)
    if (error) return { success: false, error: error.message }
    submissionId = existingRow.id
  } else {
    const { data: inserted, error } = await supabase
      .from('timesheet_submissions')
      .insert({
        organization_id: session.organizationId,
        employee_id: emp.id,
        week_start: weekStart,
        ...payload,
      })
      .select('id')
      .single()
    if (error || !inserted) {
      return { success: false, error: error?.message ?? 'No se pudo crear la solicitud.' }
    }
    submissionId = (inserted as { id: string }).id
  }

  // Aviso a managers/admins/owner (best-effort).
  try {
    const admin = createAdminClient()
    const { data: managers } = await admin
      .from('memberships')
      .select('user_id')
      .eq('organization_id', session.organizationId)
      .in('role', ['owner', 'admin', 'manager'])
    const { dispatch } = await import('@/lib/notifications/dispatch')
    const name = `${emp.first_name} ${emp.last_name}`
    for (const m of (managers ?? []) as { user_id: string }[]) {
      if (m.user_id === session.userId) continue
      await dispatch({
        userId: m.user_id,
        organizationId: session.organizationId,
        type: 'timesheet_submitted',
        title: 'Semana cerrada — solicitud de pago',
        body: `${name} cerró la semana del ${weekStart} con ${formatMinutes(summary.totalMinutes)} y pide su pago.`,
        dedupeKey: `tsheet-sub-${submissionId}-${payload.submitted_at}-${m.user_id}`,
      }).catch(() => {})
    }
  } catch {
    /* no crítico */
  }

  try {
    const { dispatchWebhook } = await import('@/lib/webhooks/dispatch')
    await dispatchWebhook(session.organizationId, 'timesheet.submitted', {
      submissionId,
      employeeId: emp.id,
      weekStart,
      totalMinutes: summary.totalMinutes,
    })
  } catch {
    /* no crítico */
  }

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

  const tz = await orgTimezone(session.organizationId)
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
  const entries = await fetchWeekEntries(subRow.employee_id, session.organizationId, subRow.week_start, tz)
  const summary = summarizeWeek(entries, subRow.week_start, tz)

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
      }).catch(() => {})
    } catch {
      /* no crítico */
    }
  }

  revalidatePath('/(app)/time-tracking', 'page')
  revalidatePath('/(employee)', 'layout')
  return { success: true }
}
