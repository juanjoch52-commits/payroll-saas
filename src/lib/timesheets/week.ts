// =============================================================================
// Timesheets semanales (puro) — cierre de semana y solicitud de pago
// =============================================================================
// Semana = lunes → domingo, definida sobre "day keys" locales de la org
// (YYYY-MM-DD via dayKeyInTz). La aritmética de fechas opera sobre los keys a
// mediodía UTC para ser inmune a DST.
// =============================================================================

import { dayKeyInTz } from '@/lib/time/tz'

export type TimeEntryStatus = 'open' | 'pending' | 'approved' | 'rejected' | 'edited'

export type WeekEntry = {
  id: string
  clockInAt: string
  clockOutAt: string | null
  billableMinutes: number | null
  status: TimeEntryStatus
}

/** Date UTC a mediodía del day key (evita saltos de día por DST/offsets). */
function atNoonUtc(dayKey: string): Date {
  return new Date(`${dayKey}T12:00:00Z`)
}

/** Suma n días a un day key 'YYYY-MM-DD'. */
export function addDays(dayKey: string, n: number): string {
  const d = atNoonUtc(dayKey)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Lunes de la semana a la que pertenece el day key. */
export function mondayOfKey(dayKey: string): string {
  const dow = atNoonUtc(dayKey).getUTCDay() // 0=Dom .. 6=Sáb
  const sinceMonday = (dow + 6) % 7
  return addDays(dayKey, -sinceMonday)
}

export function isMondayKey(dayKey: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dayKey) && mondayOfKey(dayKey) === dayKey
}

/** Los 7 day keys de la semana que empieza en weekStart (lunes). */
export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export type DaySummary = {
  day: string
  minutes: number // pending + edited + approved (candidatos a pago)
  entries: WeekEntry[]
}

export type WeekSummary = {
  weekStart: string
  /** Domingo, inclusivo (para mostrar y para week_end en DB). */
  weekEnd: string
  days: DaySummary[]
  /** Minutos facturables que pediría pagar: pending + edited + approved. */
  totalMinutes: number
  approvedMinutes: number
  pendingMinutes: number // pending + edited
  rejectedMinutes: number
  hasOpenEntry: boolean
  /** Cuántas entries componen totalMinutes. */
  entryCount: number
}

/**
 * Agrupa las entries de un empleado en la semana [weekStart, +7) por día local.
 * Las entries fuera de la semana se ignoran (el caller puede pasar de más).
 * Una entry abierta (sin clock out) marca hasOpenEntry y NO suma minutos.
 */
export function summarizeWeek(entries: WeekEntry[], weekStart: string, tz: string): WeekSummary {
  const days = weekDays(weekStart)
  const byDay = new Map<string, DaySummary>(days.map((d) => [d, { day: d, minutes: 0, entries: [] }]))

  let approvedMinutes = 0
  let pendingMinutes = 0
  let rejectedMinutes = 0
  let hasOpenEntry = false
  let entryCount = 0

  for (const e of entries) {
    const day = dayKeyInTz(e.clockInAt, tz)
    const bucket = byDay.get(day)
    if (!bucket) continue // fuera de la semana

    bucket.entries.push(e)

    if (e.status === 'open' || e.clockOutAt === null) {
      hasOpenEntry = true
      continue
    }

    const minutes = Math.max(0, e.billableMinutes ?? 0)
    if (e.status === 'rejected') {
      rejectedMinutes += minutes
      continue
    }

    // pending / edited / approved cuentan para el pago
    if (e.status === 'approved') approvedMinutes += minutes
    else pendingMinutes += minutes
    bucket.minutes += minutes
    entryCount += 1
  }

  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
    days: [...byDay.values()],
    totalMinutes: approvedMinutes + pendingMinutes,
    approvedMinutes,
    pendingMinutes,
    rejectedMinutes,
    hasOpenEntry,
    entryCount,
  }
}

export type SubmitBlockReason =
  | 'future_week'
  | 'open_entry'
  | 'no_hours'
  | 'already_submitted'
  | 'already_approved'

export type ExistingSubmissionStatus = 'submitted' | 'approved' | 'rejected' | null

/**
 * ¿Puede el empleado cerrar esta semana y pedir su pago?
 * - Semanas futuras no (la actual sí: cerrar el viernes es el caso real).
 * - No con un turno abierto dentro de la semana.
 * - Necesita minutos > 0 (pending/edited/approved).
 * - Una semana ya sometida/aprobada no se re-somete; una devuelta sí.
 */
export function canSubmitWeek(
  summary: WeekSummary,
  existing: ExistingSubmissionStatus,
  todayKey: string,
): { ok: boolean; reason?: SubmitBlockReason } {
  if (summary.weekStart > todayKey) return { ok: false, reason: 'future_week' }
  if (existing === 'submitted') return { ok: false, reason: 'already_submitted' }
  if (existing === 'approved') return { ok: false, reason: 'already_approved' }
  if (summary.hasOpenEntry) return { ok: false, reason: 'open_entry' }
  if (summary.totalMinutes <= 0) return { ok: false, reason: 'no_hours' }
  return { ok: true }
}

/** '38h 45m' (para UI y notificaciones). */
export function formatMinutes(min: number): string {
  const safe = Math.max(0, Math.round(min))
  return `${Math.floor(safe / 60)}h ${String(safe % 60).padStart(2, '0')}m`
}
