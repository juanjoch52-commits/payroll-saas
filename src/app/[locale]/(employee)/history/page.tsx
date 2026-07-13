import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { dayStartUtc, todayInTz } from '@/lib/time/tz'
import {
  addDays,
  mondayOfKey,
  isMondayKey,
  summarizeWeek,
  canSubmitWeek,
  formatMinutes,
  type WeekEntry,
  type TimeEntryStatus,
} from '@/lib/timesheets/week'
import { Card, CardContent } from '@/components/ui/card'
import { WeekCloseCard } from '@/components/employee/WeekCloseCard'
import { ManualEntryForm } from '@/components/employee/ManualEntryForm'
import { cn } from '@/lib/utils'

// Vista semanal de horas del empleado: lunes-domingo en el timezone de la org,
// con totales por día y el cierre de semana / solicitud de pago al pie.
export default async function MyHoursPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { week?: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  const [{ data: employee }, { data: org }] = await Promise.all([
    supabase
      .from('employees')
      .select('id')
      .eq('user_id', session.userId)
      .eq('organization_id', session.organizationId)
      .maybeSingle(),
    supabase
      .from('organizations')
      .select('timezone, break_auto_deduct_minutes')
      .eq('id', session.organizationId)
      .maybeSingle(),
  ])

  const orgRow = org as { timezone?: string; break_auto_deduct_minutes?: number } | null
  const tz = orgRow?.timezone || 'America/New_York'
  const breakPolicyOn = (orgRow?.break_auto_deduct_minutes ?? 0) > 0
  const todayKey = todayInTz(tz)
  const currentMonday = mondayOfKey(todayKey)
  const weekStart =
    searchParams.week && isMondayKey(searchParams.week) ? searchParams.week : currentMonday

  const empId = (employee as { id: string } | null)?.id

  const [{ data: entries }, { data: submission }] = empId
    ? await Promise.all([
        supabase
          .from('time_entries')
          .select(
            'id, clock_in_at, clock_out_at, billable_minutes, break_minutes, break_waived, manual_kind, status, clock_in_outside_geofence',
          )
          .eq('employee_id', empId)
          .eq('organization_id', session.organizationId)
          .gte('clock_in_at', dayStartUtc(weekStart, tz))
          .lt('clock_in_at', dayStartUtc(addDays(weekStart, 7), tz))
          .order('clock_in_at', { ascending: true }),
        supabase
          .from('timesheet_submissions')
          .select('status, submitted_at, review_note')
          .eq('employee_id', empId)
          .eq('week_start', weekStart)
          .maybeSingle(),
      ])
    : [{ data: [] }, { data: null }]

  type Row = {
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
  const rows = (entries ?? []) as Row[]
  const weekEntries: WeekEntry[] = rows.map((r) => ({
    id: r.id,
    clockInAt: r.clock_in_at,
    clockOutAt: r.clock_out_at,
    billableMinutes: r.billable_minutes,
    status: r.status,
  }))
  const flaggedIds = new Set(rows.filter((r) => r.clock_in_outside_geofence).map((r) => r.id))
  const extrasById = new Map(
    rows.map((r) => [r.id, { breakMinutes: r.break_minutes ?? 0, manual: r.manual_kind !== null }]),
  )

  const summary = summarizeWeek(weekEntries, weekStart, tz)
  const sub = submission as {
    status: 'submitted' | 'approved' | 'rejected'
    submitted_at: string
    review_note: string | null
  } | null

  const gate = canSubmitWeek(summary, sub?.status ?? null, todayKey)
  const blockReason =
    !gate.ok && (gate.reason === 'open_entry' || gate.reason === 'no_hours' || gate.reason === 'future_week')
      ? gate.reason
      : null

  const prevWeek = addDays(weekStart, -7)
  const nextWeek = addDays(weekStart, 7)
  const hasNext = nextWeek <= currentMonday

  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  const rangeFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const timeFmt = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: tz })
  const atNoon = (day: string) => new Date(`${day}T12:00:00Z`)

  const statusClass: Record<TimeEntryStatus, string> = {
    approved: 'text-success-foreground',
    rejected: 'text-destructive line-through',
    pending: 'text-muted-foreground',
    edited: 'text-muted-foreground',
    open: 'text-info-foreground',
  }

  return (
    <div className="container max-w-md space-y-4 py-6">
      <h1 className="text-2xl font-bold">{t('myHours.title')}</h1>

      {/* Navegación de semana */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}/history?week=${prevWeek}`}
          className="rounded-md border p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={t('myHours.prevWeek')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <p className="text-sm font-medium">
          {t('myHours.weekOf', {
            start: rangeFmt.format(atNoon(weekStart)),
            end: rangeFmt.format(atNoon(summary.weekEnd)),
          })}
        </p>
        {hasNext ? (
          <Link
            href={`/${locale}/history?week=${nextWeek}`}
            className="rounded-md border p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={t('myHours.nextWeek')}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="rounded-md border p-2 text-muted-foreground/30">
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>

      {/* Totales de la semana */}
      <Card>
        <CardContent className="grid grid-cols-3 divide-x py-3 text-center">
          <div>
            <p className="text-lg font-bold">{formatMinutes(summary.totalMinutes)}</p>
            <p className="text-xs text-muted-foreground">{t('myHours.total')}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-success-foreground">
              {formatMinutes(summary.approvedMinutes)}
            </p>
            <p className="text-xs text-muted-foreground">{t('timeTracking.approved')}</p>
          </div>
          <div>
            <p className="text-lg font-bold">{formatMinutes(summary.pendingMinutes)}</p>
            <p className="text-xs text-muted-foreground">{t('timeTracking.pending')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Días de la semana */}
      <div className="space-y-2">
        {summary.days.map((day) => (
          <Card key={day.day} className={cn(day.day === todayKey && 'border-primary/50')}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium capitalize">{dayFmt.format(atNoon(day.day))}</p>
                <p className={cn('text-sm font-semibold', day.minutes === 0 && 'text-muted-foreground/50')}>
                  {day.minutes > 0 ? formatMinutes(day.minutes) : '—'}
                </p>
              </div>
              {day.entries.length > 0 && (
                <div className="mt-2 space-y-1 border-t pt-2">
                  {day.entries.map((e) => {
                    const extras = extrasById.get(e.id)
                    return (
                      <div key={e.id} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          {timeFmt.format(new Date(e.clockInAt))}
                          {' → '}
                          {e.clockOutAt ? timeFmt.format(new Date(e.clockOutAt)) : t('myHours.openShift')}
                          {flaggedIds.has(e.id) && <AlertTriangle className="h-3 w-3 text-warning-foreground" />}
                          {extras?.manual && (
                            <span className="rounded bg-muted px-1 text-[10px] uppercase text-muted-foreground">
                              {t('timeTracking.manual')}
                            </span>
                          )}
                          {(extras?.breakMinutes ?? 0) > 0 && (
                            <span className="text-muted-foreground/70">
                              −{extras!.breakMinutes}m
                            </span>
                          )}
                        </span>
                        <span className={statusClass[e.status]}>
                          {e.status !== 'open' && `${formatMinutes(Math.max(0, e.billableMinutes ?? 0))} · `}
                          {t(`timeTracking.${e.status}` as 'timeTracking.pending')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {summary.rejectedMinutes > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {t('myHours.rejectedNotCounted', { total: formatMinutes(summary.rejectedMinutes) })}
        </p>
      )}

      {/* ¿Olvidaste fichar? — turno manual pendiente de aprobación */}
      <ManualEntryForm maxDate={todayKey} breakPolicyActive={breakPolicyOn} />

      {/* Cierre de semana / solicitud de pago */}
      <WeekCloseCard
        locale={locale}
        weekStart={weekStart}
        totalMinutes={summary.totalMinutes}
        canSubmit={gate.ok}
        blockReason={blockReason}
        submission={sub}
      />
    </div>
  )
}
