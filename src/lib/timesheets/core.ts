// =============================================================================
// Core de timesheets del empleado (server-only, compartido web + API móvil)
// =============================================================================
// Orquestación única para: vista semanal, cerrar semana / pedir pago, entry
// manual ("olvidé fichar") y corrección de clock-out olvidado. Las Server
// Actions web le pasan el cliente RLS del usuario; las rutas /api/v1 (app
// móvil, Bearer JWT) le pasan el admin client con ids ya autenticados — la
// lógica y las validaciones son EXACTAMENTE las mismas.
// =============================================================================

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { dayStartUtc, localTimeToUtc, todayInTz } from '@/lib/time/tz'
import { applyAutoBreak, breakPolicyActive, type BreakPolicy } from '@/lib/time/breaks'
import {
  addDays,
  mondayOfKey,
  isMondayKey,
  summarizeWeek,
  canSubmitWeek,
  formatMinutes,
  type WeekEntry,
  type TimeEntryStatus,
  type ExistingSubmissionStatus,
  type SubmitBlockReason,
} from '@/lib/timesheets/week'
import type { NotifType } from '@/lib/notifications/dispatch'

export type Db = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>

export type EmployeeCtx = {
  employeeId: string
  organizationId: string
  userId: string
}

export type CoreResult = { ok: true } | { ok: false; error: string }

// -----------------------------------------------------------------------------
// Lecturas compartidas
// -----------------------------------------------------------------------------

export async function orgTimezone(db: Db, orgId: string): Promise<string> {
  const { data } = await db.from('organizations').select('timezone').eq('id', orgId).maybeSingle()
  return (data as { timezone?: string } | null)?.timezone || 'America/New_York'
}

export async function fetchBreakPolicy(db: Db, orgId: string): Promise<BreakPolicy | null> {
  const { data } = await db
    .from('organizations')
    .select('break_auto_deduct_minutes, break_auto_deduct_threshold_minutes')
    .eq('id', orgId)
    .maybeSingle()
  const row = data as {
    break_auto_deduct_minutes?: number
    break_auto_deduct_threshold_minutes?: number
  } | null
  if (!row) return null
  return {
    autoDeductMinutes: row.break_auto_deduct_minutes ?? 0,
    thresholdMinutes: row.break_auto_deduct_threshold_minutes ?? 0,
  }
}

export type RawWeekEntry = {
  id: string
  clock_in_at: string
  clock_out_at: string | null
  billable_minutes: number | null
  break_minutes: number | null
  break_waived: boolean
  manual_kind: 'full' | 'clock_out' | null
  status: TimeEntryStatus
  clock_in_outside_geofence: boolean
}

/** Entries del empleado cuya ENTRADA cae en la semana local [weekStart, +7). */
export async function fetchWeekEntriesRaw(
  db: Db,
  ctx: Pick<EmployeeCtx, 'employeeId' | 'organizationId'>,
  weekStart: string,
  tz: string,
): Promise<RawWeekEntry[]> {
  const { data } = await db
    .from('time_entries')
    .select(
      'id, clock_in_at, clock_out_at, billable_minutes, break_minutes, break_waived, manual_kind, status, clock_in_outside_geofence',
    )
    .eq('employee_id', ctx.employeeId)
    .eq('organization_id', ctx.organizationId)
    .gte('clock_in_at', dayStartUtc(weekStart, tz))
    .lt('clock_in_at', dayStartUtc(addDays(weekStart, 7), tz))
    .order('clock_in_at', { ascending: true })
  return (data ?? []) as RawWeekEntry[]
}

export function toWeekEntries(rows: RawWeekEntry[]): WeekEntry[] {
  return rows.map((r) => ({
    id: r.id,
    clockInAt: r.clock_in_at,
    clockOutAt: r.clock_out_at,
    billableMinutes: r.billable_minutes,
    status: r.status,
  }))
}

export type SubmissionRow = {
  id: string
  status: 'submitted' | 'approved' | 'rejected'
  submitted_at: string
  review_note: string | null
}

export async function fetchSubmission(
  db: Db,
  employeeId: string,
  weekStart: string,
): Promise<SubmissionRow | null> {
  const { data } = await db
    .from('timesheet_submissions')
    .select('id, status, submitted_at, review_note')
    .eq('employee_id', employeeId)
    .eq('week_start', weekStart)
    .maybeSingle()
  return (data as SubmissionRow | null) ?? null
}

/** ¿La semana local de `dayKey` ya fue cerrada (submitted/approved)? */
export async function weekIsClosed(db: Db, employeeId: string, dayKey: string): Promise<boolean> {
  const sub = await fetchSubmission(db, employeeId, mondayOfKey(dayKey))
  return sub?.status === 'submitted' || sub?.status === 'approved'
}

// -----------------------------------------------------------------------------
// Notificaciones a managers (siempre via admin client, best-effort)
// -----------------------------------------------------------------------------

export async function notifyOrgManagers(
  organizationId: string,
  excludeUserId: string,
  input: { type: NotifType; title: string; body: string; dedupePrefix: string },
) {
  try {
    const admin = createAdminClient()
    const { data: managers } = await admin
      .from('memberships')
      .select('user_id')
      .eq('organization_id', organizationId)
      .in('role', ['owner', 'admin', 'manager'])
    const { dispatch } = await import('@/lib/notifications/dispatch')
    for (const m of (managers ?? []) as { user_id: string }[]) {
      if (m.user_id === excludeUserId) continue
      await dispatch({
        userId: m.user_id,
        organizationId,
        type: input.type,
        title: input.title,
        body: input.body,
        dedupeKey: `${input.dedupePrefix}-${m.user_id}`,
      }).catch(() => {})
    }
  } catch {
    /* no crítico */
  }
}

async function employeeName(db: Db, employeeId: string): Promise<string> {
  const { data } = await db
    .from('employees')
    .select('first_name, last_name')
    .eq('id', employeeId)
    .maybeSingle()
  const e = data as { first_name: string; last_name: string } | null
  return e ? `${e.first_name} ${e.last_name}` : 'Empleado'
}

// -----------------------------------------------------------------------------
// Vista semanal (payload para /api/v1/time/week y reutilizable en web)
// -----------------------------------------------------------------------------

export type WeekViewPayload = {
  weekStart: string
  weekEnd: string
  timezone: string
  today: string
  prevWeek: string
  /** null cuando la semana siguiente es futura (no navegable). */
  nextWeek: string | null
  totals: { total: number; approved: number; pending: number; rejected: number }
  hasOpenEntry: boolean
  days: { day: string; minutes: number; entries: RawWeekEntry[] }[]
  submission: Pick<SubmissionRow, 'status' | 'submitted_at' | 'review_note'> | null
  canSubmit: boolean
  blockReason: SubmitBlockReason | null
  breakPolicy: BreakPolicy | null
  /** Jornada estándar PAGADA en minutos (0 = contador apagado). */
  standardShiftMinutes: number
}

export async function getWeekView(
  db: Db,
  ctx: EmployeeCtx,
  weekParam?: string | null,
): Promise<WeekViewPayload> {
  const tz = await orgTimezone(db, ctx.organizationId)
  const today = todayInTz(tz)
  const currentMonday = mondayOfKey(today)
  const weekStart = weekParam && isMondayKey(weekParam) ? weekParam : currentMonday

  const [rows, submission, breakPolicy, { data: shiftRow }] = await Promise.all([
    fetchWeekEntriesRaw(db, ctx, weekStart, tz),
    fetchSubmission(db, ctx.employeeId, weekStart),
    fetchBreakPolicy(db, ctx.organizationId),
    db
      .from('organizations')
      .select('standard_shift_minutes')
      .eq('id', ctx.organizationId)
      .maybeSingle(),
  ])

  const summary = summarizeWeek(toWeekEntries(rows), weekStart, tz)
  const byId = new Map(rows.map((r) => [r.id, r]))
  const gate = canSubmitWeek(summary, submission?.status ?? null, today)
  const nextWeek = addDays(weekStart, 7)

  return {
    weekStart,
    weekEnd: summary.weekEnd,
    timezone: tz,
    today,
    prevWeek: addDays(weekStart, -7),
    nextWeek: nextWeek <= currentMonday ? nextWeek : null,
    totals: {
      total: summary.totalMinutes,
      approved: summary.approvedMinutes,
      pending: summary.pendingMinutes,
      rejected: summary.rejectedMinutes,
    },
    hasOpenEntry: summary.hasOpenEntry,
    days: summary.days.map((d) => ({
      day: d.day,
      minutes: d.minutes,
      entries: d.entries.map((e) => byId.get(e.id)!).filter(Boolean),
    })),
    submission: submission
      ? { status: submission.status, submitted_at: submission.submitted_at, review_note: submission.review_note }
      : null,
    canSubmit: gate.ok,
    blockReason: gate.ok ? null : (gate.reason ?? null),
    breakPolicy,
    standardShiftMinutes:
      (shiftRow as { standard_shift_minutes?: number } | null)?.standard_shift_minutes ?? 0,
  }
}

// -----------------------------------------------------------------------------
// Cerrar semana / pedir pago
// -----------------------------------------------------------------------------

const SUBMIT_BLOCK_MESSAGES: Record<SubmitBlockReason, string> = {
  future_week: 'No puedes cerrar una semana futura.',
  open_entry: 'Tienes un turno abierto en esa semana. Haz clock out primero.',
  no_hours: 'No hay horas para someter en esa semana.',
  already_submitted: 'Esa semana ya fue enviada y está en revisión.',
  already_approved: 'Esa semana ya fue aprobada.',
}

export async function submitWeekCore(
  db: Db,
  ctx: EmployeeCtx,
  weekStart: string,
  note?: string,
): Promise<CoreResult> {
  if (!isMondayKey(weekStart)) return { ok: false, error: 'La semana debe empezar en lunes.' }

  const tz = await orgTimezone(db, ctx.organizationId)
  const rows = await fetchWeekEntriesRaw(db, ctx, weekStart, tz)
  const summary = summarizeWeek(toWeekEntries(rows), weekStart, tz)
  const existing = await fetchSubmission(db, ctx.employeeId, weekStart)

  const gate = canSubmitWeek(
    summary,
    (existing?.status ?? null) as ExistingSubmissionStatus,
    todayInTz(tz),
  )
  if (!gate.ok) return { ok: false, error: SUBMIT_BLOCK_MESSAGES[gate.reason ?? 'no_hours'] }

  const payload = {
    week_end: summary.weekEnd,
    total_minutes: summary.totalMinutes,
    entry_count: summary.entryCount,
    employee_note: note?.trim() ? note.trim().slice(0, 500) : null,
    status: 'submitted' as const,
    submitted_at: new Date().toISOString(),
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
  }

  let submissionId: string
  if (existing) {
    const { error } = await db.from('timesheet_submissions').update(payload).eq('id', existing.id)
    if (error) return { ok: false, error: error.message }
    submissionId = existing.id
  } else {
    const { data: inserted, error } = await db
      .from('timesheet_submissions')
      .insert({
        organization_id: ctx.organizationId,
        employee_id: ctx.employeeId,
        week_start: weekStart,
        ...payload,
      })
      .select('id')
      .single()
    if (error || !inserted) return { ok: false, error: error?.message ?? 'No se pudo crear la solicitud.' }
    submissionId = (inserted as { id: string }).id
  }

  const name = await employeeName(db, ctx.employeeId)
  await notifyOrgManagers(ctx.organizationId, ctx.userId, {
    type: 'timesheet_submitted',
    title: 'Semana cerrada — solicitud de pago',
    body: `${name} cerró la semana del ${weekStart} con ${formatMinutes(summary.totalMinutes)} y pide su pago.`,
    dedupePrefix: `tsheet-sub-${submissionId}-${payload.submitted_at}`,
  })

  try {
    const { dispatchWebhook } = await import('@/lib/webhooks/dispatch')
    await dispatchWebhook(ctx.organizationId, 'timesheet.submitted', {
      submissionId,
      employeeId: ctx.employeeId,
      weekStart,
      totalMinutes: summary.totalMinutes,
    })
  } catch {
    /* no crítico */
  }

  return { ok: true }
}

// -----------------------------------------------------------------------------
// Entry manual ("olvidé fichar")
// -----------------------------------------------------------------------------

export type ManualEntryInput = {
  date: string // YYYY-MM-DD (día local org)
  timeIn: string // HH:MM
  timeOut: string // HH:MM
  noBreak?: boolean
  reason: string
}

export async function addManualEntryCore(
  db: Db,
  ctx: EmployeeCtx,
  input: ManualEntryInput,
): Promise<CoreResult> {
  const tz = await orgTimezone(db, ctx.organizationId)
  const todayKey = todayInTz(tz)

  if (input.date > todayKey) return { ok: false, error: 'No puedes reportar horas futuras.' }
  if (input.date < addDays(todayKey, -30)) {
    return { ok: false, error: 'Solo puedes reportar hasta 30 días atrás. Habla con tu manager.' }
  }
  if (await weekIsClosed(db, ctx.employeeId, input.date)) {
    return { ok: false, error: 'Esa semana ya fue cerrada. Pide a tu manager que la ajuste.' }
  }

  const clockInAt = localTimeToUtc(input.date, input.timeIn, tz)
  const clockOutAt = localTimeToUtc(input.date, input.timeOut, tz)
  const durationMinutes = Math.round((Date.parse(clockOutAt) - Date.parse(clockInAt)) / 60_000)
  if (durationMinutes <= 0) return { ok: false, error: 'La salida debe ser posterior a la entrada.' }
  if (durationMinutes > 16 * 60) {
    return { ok: false, error: 'Un turno no puede durar más de 16 horas. Habla con tu manager.' }
  }

  // Sin solaparse con entries existentes (incluye turnos abiertos).
  const { data: overlap } = await db
    .from('time_entries')
    .select('id')
    .eq('employee_id', ctx.employeeId)
    .lt('clock_in_at', clockOutAt)
    .or(`clock_out_at.gt.${clockInAt},clock_out_at.is.null`)
    .limit(1)
  if (overlap && overlap.length > 0) {
    return { ok: false, error: 'Ese horario se solapa con otro registro tuyo.' }
  }

  const policy = await fetchBreakPolicy(db, ctx.organizationId)
  const waived = !!input.noBreak && breakPolicyActive(policy)
  const { breakMinutes, billableMinutes } = applyAutoBreak(durationMinutes, policy, waived)

  const { data: entry, error } = await db
    .from('time_entries')
    .insert({
      organization_id: ctx.organizationId,
      employee_id: ctx.employeeId,
      user_id: ctx.userId,
      clock_in_at: clockInAt,
      clock_out_at: clockOutAt,
      duration_minutes: durationMinutes,
      break_minutes: breakMinutes,
      billable_minutes: billableMinutes,
      break_waived: waived,
      status: 'pending',
      manual_kind: 'full',
      manual_reason: input.reason.trim().slice(0, 500),
    })
    .select('id')
    .single()
  if (error || !entry) return { ok: false, error: error?.message ?? 'No se pudo crear el registro.' }

  const name = await employeeName(db, ctx.employeeId)
  await notifyOrgManagers(ctx.organizationId, ctx.userId, {
    type: 'time_entry_pending',
    title: 'Horas manuales por aprobar',
    body: `${name} reportó ${input.date} ${input.timeIn}–${input.timeOut} (${formatMinutes(billableMinutes)}): ${input.reason.trim()}`,
    dedupePrefix: `manual-${(entry as { id: string }).id}`,
  })

  return { ok: true }
}

// -----------------------------------------------------------------------------
// Corrección de clock-out olvidado
// -----------------------------------------------------------------------------

export type FixClockOutInput = {
  entryId: string
  date: string // YYYY-MM-DD (día local org)
  time: string // HH:MM
  noBreak?: boolean
  reason: string
}

export async function fixClockOutCore(
  db: Db,
  ctx: EmployeeCtx,
  input: FixClockOutInput,
): Promise<CoreResult> {
  const { data: open } = await db
    .from('time_entries')
    .select('id, clock_in_at')
    .eq('id', input.entryId)
    .eq('employee_id', ctx.employeeId)
    .eq('organization_id', ctx.organizationId)
    .is('clock_out_at', null)
    .maybeSingle()
  if (!open) return { ok: false, error: 'No se encontró tu turno abierto.' }

  const tz = await orgTimezone(db, ctx.organizationId)
  const clockOutAt = localTimeToUtc(input.date, input.time, tz)
  const clockInMs = Date.parse((open as { clock_in_at: string }).clock_in_at)
  const durationMinutes = Math.round((Date.parse(clockOutAt) - clockInMs) / 60_000)
  if (durationMinutes <= 0) return { ok: false, error: 'La salida debe ser posterior a la entrada.' }
  if (Date.parse(clockOutAt) > Date.now()) {
    return { ok: false, error: 'La salida no puede estar en el futuro.' }
  }
  if (durationMinutes > 16 * 60) {
    return { ok: false, error: 'Un turno no puede durar más de 16 horas. Habla con tu manager.' }
  }

  const policy = await fetchBreakPolicy(db, ctx.organizationId)
  const waived = !!input.noBreak && breakPolicyActive(policy)
  const { breakMinutes, billableMinutes } = applyAutoBreak(durationMinutes, policy, waived)

  const { error } = await db
    .from('time_entries')
    .update({
      clock_out_at: clockOutAt,
      duration_minutes: durationMinutes,
      break_minutes: breakMinutes,
      billable_minutes: billableMinutes,
      break_waived: waived,
      status: 'pending',
      manual_kind: 'clock_out',
      manual_reason: input.reason.trim().slice(0, 500),
    })
    .eq('id', input.entryId)
  if (error) return { ok: false, error: error.message }

  const name = await employeeName(db, ctx.employeeId)
  await notifyOrgManagers(ctx.organizationId, ctx.userId, {
    type: 'time_entry_pending',
    title: 'Salida corregida por aprobar',
    body: `${name} corrigió su salida olvidada: ${input.date} ${input.time} (${formatMinutes(billableMinutes)}): ${input.reason.trim()}`,
    dedupePrefix: `fixout-${input.entryId}-${clockOutAt}`,
  })

  return { ok: true }
}
