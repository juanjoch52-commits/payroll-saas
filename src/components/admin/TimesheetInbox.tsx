'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CalendarCheck2, Check, Undo2 } from 'lucide-react'
import { approveTimesheetWeek, rejectTimesheetWeek } from '@/app/actions/timesheets'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatMinutes } from '@/lib/timesheets/week'

export type TimesheetSubmissionRow = {
  id: string
  week_start: string
  week_end: string
  total_minutes: number
  entry_count: number
  status: 'submitted' | 'approved' | 'rejected'
  submitted_at: string
  employee_note: string | null
  review_note: string | null
  employees:
    | { first_name: string; last_name: string }
    | { first_name: string; last_name: string }[]
}

function employeeName(row: TimesheetSubmissionRow): string {
  const e = Array.isArray(row.employees) ? row.employees[0] : row.employees
  return e ? `${e.first_name} ${e.last_name}` : '—'
}

/**
 * Bandeja del manager: semanas cerradas por los empleados (solicitudes de
 * pago). Aprobar una semana aprueba EN BLOQUE sus time entries pendientes,
 * que es lo que consume la nómina.
 */
export function TimesheetInbox({
  locale,
  submissions,
}: {
  locale: string
  submissions: TimesheetSubmissionRow[]
}) {
  const t = useTranslations()
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const sorted = [...submissions].sort((a, b) => {
    if ((a.status === 'submitted') !== (b.status === 'submitted')) {
      return a.status === 'submitted' ? -1 : 1
    }
    return a.submitted_at < b.submitted_at ? 1 : -1
  })

  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const range = (row: TimesheetSubmissionRow) =>
    `${dateFmt.format(new Date(`${row.week_start}T12:00:00Z`))} – ${dateFmt.format(new Date(`${row.week_end}T12:00:00Z`))}`

  function handleApprove(id: string) {
    setError(null)
    setBusyId(id)
    startTransition(async () => {
      const res = await approveTimesheetWeek(id)
      if (!res.success) setError(res.error ?? 'Error')
      setBusyId(null)
      router.refresh()
    })
  }

  function handleReject(id: string) {
    const note = prompt(t('timesheets.returnPrompt'))
    if (!note) return
    setError(null)
    setBusyId(id)
    startTransition(async () => {
      const res = await rejectTimesheetWeek(id, note)
      if (!res.success) setError(res.error ?? 'Error')
      setBusyId(null)
      router.refresh()
    })
  }

  const pendingCount = submissions.filter((s) => s.status === 'submitted').length

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarCheck2 className="h-5 w-5 text-primary" />
            {t('timesheets.title')}
            {pendingCount > 0 && <Badge>{pendingCount}</Badge>}
          </h2>
          <p className="hidden text-xs text-muted-foreground sm:block">{t('timesheets.approveHint')}</p>
        </div>

        {error && (
          <p className="rounded-md border border-destructive bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="divide-y">
          {sorted.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{employeeName(row)}</p>
                <p className="text-xs text-muted-foreground">
                  {t('timesheets.weekOf', { range: range(row) })} ·{' '}
                  {t('timesheets.entriesCount', { count: row.entry_count })}
                </p>
                {row.employee_note && (
                  <p className="mt-1 truncate text-xs italic text-muted-foreground">
                    “{row.employee_note}”
                  </p>
                )}
                {row.status === 'rejected' && row.review_note && (
                  <p className="mt-1 truncate text-xs text-destructive">↩ {row.review_note}</p>
                )}
              </div>

              <p className="text-sm font-semibold tabular-nums">{formatMinutes(row.total_minutes)}</p>

              {row.status === 'submitted' ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(row.id)}
                    disabled={busyId === row.id}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    {t('timesheets.approveWeek')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(row.id)}
                    disabled={busyId === row.id}
                  >
                    <Undo2 className="mr-1 h-4 w-4" />
                    {t('timesheets.returnWeek')}
                  </Button>
                </div>
              ) : (
                <Badge variant={row.status === 'approved' ? 'default' : 'destructive'}>
                  {row.status === 'approved' ? t('timeTracking.approved') : t('timesheets.returned')}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
