import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { ClockControls } from '@/components/employee/ClockControls'
import { FixClockOutForm } from '@/components/employee/FixClockOutForm'
import { Card, CardContent } from '@/components/ui/card'
import { dayKeyInTz, dayStartUtc, todayInTz } from '@/lib/time/tz'
import {
  addDays,
  mondayOfKey,
  summarizeWeek,
  formatMinutes,
  type WeekEntry,
  type TimeEntryStatus,
} from '@/lib/timesheets/week'

export default async function EmployeeClockPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  // Encontrar la fila de employees del user
  const [{ data: employee }, { data: org }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, first_name, last_name, organization_id')
      .eq('user_id', session.userId)
      .eq('organization_id', session.organizationId)
      .maybeSingle(),
    supabase
      .from('organizations')
      .select('timezone, break_auto_deduct_minutes, break_auto_deduct_threshold_minutes')
      .eq('id', session.organizationId)
      .maybeSingle(),
  ])

  const orgRow = org as {
    timezone?: string
    break_auto_deduct_minutes?: number
  } | null
  const tz = orgRow?.timezone || 'America/New_York'
  const breakMinutes = orgRow?.break_auto_deduct_minutes ?? 0
  const todayKey = todayInTz(tz)
  const weekStart = mondayOfKey(todayKey)

  // Entry abierto (si existe) + horas de la semana en curso
  const [{ data: openEntry }, { data: weekRows }] = employee
    ? await Promise.all([
        supabase
          .from('time_entries')
          .select('id, clock_in_at, clock_in_outside_geofence')
          .eq('employee_id', employee.id)
          .is('clock_out_at', null)
          .maybeSingle(),
        supabase
          .from('time_entries')
          .select('id, clock_in_at, clock_out_at, billable_minutes, status')
          .eq('employee_id', employee.id)
          .eq('organization_id', session.organizationId)
          .gte('clock_in_at', dayStartUtc(weekStart, tz))
          .lt('clock_in_at', dayStartUtc(addDays(weekStart, 7), tz)),
      ])
    : [{ data: null }, { data: [] }]

  type Row = {
    id: string
    clock_in_at: string
    clock_out_at: string | null
    billable_minutes: number | null
    status: TimeEntryStatus
  }
  const weekEntries: WeekEntry[] = ((weekRows ?? []) as Row[]).map((r) => ({
    id: r.id,
    clockInAt: r.clock_in_at,
    clockOutAt: r.clock_out_at,
    billableMinutes: r.billable_minutes,
    status: r.status,
  }))
  const summary = summarizeWeek(weekEntries, weekStart, tz)
  const todayMinutes = summary.days.find((d) => d.day === todayKey)?.minutes ?? 0

  // Turno abierto "olvidado": lleva más de 10h → ofrecer corrección de salida.
  const open = openEntry as { id: string; clock_in_at: string; clock_in_outside_geofence: boolean } | null
  const staleOpen = open && Date.now() - Date.parse(open.clock_in_at) > 10 * 3_600_000

  return (
    <div className="container max-w-md space-y-4 py-6">
      {staleOpen && open && (
        <FixClockOutForm
          entryId={open.id}
          defaultDate={dayKeyInTz(open.clock_in_at, tz)}
          maxDate={todayKey}
          breakPolicyActive={breakMinutes > 0}
        />
      )}

      <ClockControls
        locale={locale}
        employeeName={employee ? `${employee.first_name} ${employee.last_name}` : null}
        openEntry={open}
        breakPolicyActive={breakMinutes > 0}
        breakMinutes={breakMinutes}
      />

      {/* Resumen: hoy + semana en curso, con acceso a la vista semanal */}
      {employee && (
        <Link href={`/${locale}/history`} className="block">
          <Card className="transition-colors hover:bg-accent">
            <CardContent className="flex items-center justify-between py-3">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold">{formatMinutes(todayMinutes)}</p>
                  <p className="text-xs text-muted-foreground">{t('clock.todaySoFar')}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{formatMinutes(summary.totalMinutes)}</p>
                  <p className="text-xs text-muted-foreground">{t('clock.weekSoFar')}</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs text-primary">
                {t('clock.viewHours')}
                <ChevronRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Guía de inducción del trabajador */}
      <p className="text-center">
        <Link href={`/${locale}/help`} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {t('clock.helpLink')}
        </Link>
      </p>
    </div>
  )
}
