'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Plus, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createShift, deleteShift, publishWeek } from '@/app/actions/scheduling'

type Person = { first_name: string; last_name: string }
type Shift = {
  id: string
  employee_id: string | null
  starts_at: string
  ends_at: string
  role_label: string | null
  break_minutes: number
  status: string
  employees: Person | Person[] | null
  worksites: { name: string } | { name: string }[] | null
}
type Employee = { id: string; first_name: string; last_name: string }
type Worksite = { id: string; name: string }

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function one<T>(x: T | T[] | null): T | null {
  return Array.isArray(x) ? x[0] ?? null : x
}
function shiftHours(s: Shift): number {
  const ms = new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()
  return Math.max(0, ms / 3600000 - (s.break_minutes ?? 0) / 60)
}
function money(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

export function ScheduleBoard({
  locale,
  weekStartISO,
  shifts,
  employees,
  worksites,
  rateByEmployee,
}: {
  locale: string
  weekStartISO: string
  shifts: Shift[]
  employees: Employee[]
  worksites: Worksite[]
  rateByEmployee: Record<string, number>
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const days = useMemo(() => {
    const base = new Date(weekStartISO + 'T00:00:00')
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      return d
    })
  }, [weekStartISO])

  // Resumen
  const totalHours = shifts.reduce((s, sh) => s + shiftHours(sh), 0)
  const openCount = shifts.filter((s) => s.status === 'open').length
  const draftCount = shifts.filter((s) => s.status === 'draft').length
  const projectedCost = shifts.reduce((sum, sh) => {
    const rate = sh.employee_id ? rateByEmployee[sh.employee_id] : undefined
    return sum + (rate ? shiftHours(sh) * rate : 0)
  }, 0)

  // Form state
  const [fEmp, setFEmp] = useState('')
  const [fWorksite, setFWorksite] = useState('')
  const [fDate, setFDate] = useState(weekStartISO)
  const [fStart, setFStart] = useState('09:00')
  const [fEnd, setFEnd] = useState('17:00')
  const [fRole, setFRole] = useState('')
  const [fBreak, setFBreak] = useState('0')

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.success) router.refresh()
      else setError(res.error ?? 'Error')
    })
  }

  function submitShift() {
    const startsAt = new Date(`${fDate}T${fStart}`).toISOString()
    const endsAt = new Date(`${fDate}T${fEnd}`).toISOString()
    run(() =>
      createShift({
        employeeId: fEmp,
        worksiteId: fWorksite,
        startsAt,
        endsAt,
        roleLabel: fRole,
        breakMinutes: Number(fBreak) || 0,
      }),
    )
    setShowAdd(false)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/${locale}/schedule?week=${addDaysISO(weekStartISO, -7)}`}>
            <Button variant="outline" size="sm"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <span className="text-sm font-semibold">
            {days[0].toLocaleDateString(locale, { day: 'numeric', month: 'short' })} –{' '}
            {days[6].toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
          </span>
          <Link href={`/${locale}/schedule?week=${addDaysISO(weekStartISO, 7)}`}>
            <Button variant="outline" size="sm"><ChevronRight className="h-4 w-4" /></Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAdd((v) => !v)}>
            <Plus className="h-4 w-4" /> {t('schedule.addShift')}
          </Button>
          <Button
            size="sm"
            className="gap-1"
            disabled={pending || draftCount === 0}
            onClick={() => run(() => publishWeek(weekStartISO))}
          >
            <Send className="h-4 w-4" /> {t('schedule.publish')} {draftCount > 0 ? `(${draftCount})` : ''}
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-md bg-muted px-3 py-1.5">
          {t('schedule.totalHours')}: <b>{totalHours.toFixed(1)}h</b>
        </span>
        <span className="rounded-md bg-muted px-3 py-1.5">
          {t('schedule.shifts')}: <b>{shifts.length}</b>
        </span>
        {openCount > 0 && (
          <span className="rounded-md bg-warning/15 px-3 py-1.5 text-warning-foreground">
            {t('schedule.open')}: <b>{openCount}</b>
          </span>
        )}
        {projectedCost > 0 && (
          <span className="rounded-md bg-muted px-3 py-1.5">
            {t('schedule.projectedCost')}: <b>≈ {money(projectedCost)}</b>
          </span>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Add form */}
      {showAdd && (
        <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-3 lg:grid-cols-7">
          <div className="space-y-1">
            <Label className="text-xs">{t('schedule.employee')}</Label>
            <select value={fEmp} onChange={(e) => setFEmp(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="">{t('schedule.openShift')}</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('schedule.worksite')}</Label>
            <select value={fWorksite} onChange={(e) => setFWorksite(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="">—</option>
              {worksites.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label className="text-xs">{t('schedule.date')}</Label><Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className="h-9" /></div>
          <div className="space-y-1"><Label className="text-xs">{t('schedule.start')}</Label><Input type="time" value={fStart} onChange={(e) => setFStart(e.target.value)} className="h-9" /></div>
          <div className="space-y-1"><Label className="text-xs">{t('schedule.end')}</Label><Input type="time" value={fEnd} onChange={(e) => setFEnd(e.target.value)} className="h-9" /></div>
          <div className="space-y-1"><Label className="text-xs">{t('schedule.role')}</Label><Input value={fRole} onChange={(e) => setFRole(e.target.value)} className="h-9" placeholder="Cocina" /></div>
          <div className="flex items-end"><Button onClick={submitShift} disabled={pending} className="w-full">{t('common.create')}</Button></div>
        </div>
      )}

      {/* Week grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => {
          const key = localDayKey(day)
          const dayShifts = shifts.filter((s) => localDayKey(new Date(s.starts_at)) === key)
          return (
            <div key={key} className="rounded-lg border bg-card p-2.5">
              <div className="mb-2 text-center">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {day.toLocaleDateString(locale, { weekday: 'short' })}
                </p>
                <p className="text-sm font-bold">{day.getDate()}</p>
              </div>
              <div className="space-y-2">
                {dayShifts.map((s) => {
                  const emp = one(s.employees)
                  const ws = one(s.worksites)
                  return (
                    <div key={s.id} className={'group rounded-md border p-2 text-xs ' + (s.status === 'open' ? 'border-warning/40 bg-warning/5' : s.status === 'draft' ? 'border-dashed' : 'bg-background')}>
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-semibold">
                          {new Date(s.starts_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}–
                          {new Date(s.ends_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button onClick={() => run(() => deleteShift(s.id))} className="opacity-0 transition group-hover:opacity-100" aria-label="delete">
                          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                      <p className="mt-1 font-medium">
                        {emp ? `${emp.first_name} ${emp.last_name}` : <span className="text-warning-foreground">{t('schedule.openShift')}</span>}
                      </p>
                      {(s.role_label || ws) && (
                        <p className="text-muted-foreground">{[s.role_label, ws?.name].filter(Boolean).join(' · ')}</p>
                      )}
                      {s.status === 'draft' && <Badge variant="muted" className="mt-1">{t('schedule.draft')}</Badge>}
                    </div>
                  )
                })}
                {dayShifts.length === 0 && <p className="py-3 text-center text-[11px] text-muted-foreground">—</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
