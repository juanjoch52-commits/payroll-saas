'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { recordTip, approveTip, rejectTip, distributeTipPool } from '@/app/actions/tips'

type Person = { first_name: string; last_name: string }
type Employee = { id: string; first_name: string; last_name: string }
type Tip = {
  id: string
  work_date: string
  amount_cents: number
  source: string
  status: string
  employees: Person | Person[] | null
}

const STATUS: Record<string, 'success' | 'warning' | 'destructive' | 'muted'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'destructive',
}
function one<T>(x: T | T[] | null): T | null {
  return Array.isArray(x) ? x[0] ?? null : x
}
function money(c: number) {
  return `$${(c / 100).toFixed(2)}`
}

export function TipsPanel({ employees, tips }: { employees: Employee[]; tips: Tip[] }) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  // Record
  const [rEmp, setREmp] = useState(employees[0]?.id ?? '')
  const [rDate, setRDate] = useState(today)
  const [rAmount, setRAmount] = useState('')
  const [rSource, setRSource] = useState<'cash' | 'card' | 'declared'>('card')

  // Pool
  const [pDate, setPDate] = useState(today)
  const [pTotal, setPTotal] = useState('')
  const [pMethod, setPMethod] = useState<'hours' | 'equal'>('hours')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.success) router.refresh()
      else setError(res.error ?? 'Error')
    })
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Registrar propina */}
        <div className="space-y-3 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">{t('tips.record')}</h2>
          <div className="space-y-1">
            <Label className="text-xs">{t('tips.employee')}</Label>
            <select value={rEmp} onChange={(e) => setREmp(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
              {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1"><Label className="text-xs">{t('tips.date')}</Label><Input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">{t('tips.amount')}</Label><Input type="number" step="0.01" value={rAmount} onChange={(e) => setRAmount(e.target.value)} /></div>
            <div className="space-y-1">
              <Label className="text-xs">{t('tips.source')}</Label>
              <select value={rSource} onChange={(e) => setRSource(e.target.value as 'card')} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="card">{t('tips.sources.card')}</option>
                <option value="cash">{t('tips.sources.cash')}</option>
                <option value="declared">{t('tips.sources.declared')}</option>
              </select>
            </div>
          </div>
          <Button
            className="w-full"
            disabled={pending || !rEmp || !rAmount}
            onClick={() => run(() => recordTip({ employeeId: rEmp, workDate: rDate, amountCents: Math.round(parseFloat(rAmount) * 100) || 0, source: rSource }))}
          >
            {t('tips.add')}
          </Button>
        </div>

        {/* Tip pool */}
        <div className="space-y-3 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">{t('tips.pool')}</h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1"><Label className="text-xs">{t('tips.date')}</Label><Input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">{t('tips.total')}</Label><Input type="number" step="0.01" value={pTotal} onChange={(e) => setPTotal(e.target.value)} /></div>
            <div className="space-y-1">
              <Label className="text-xs">{t('tips.method')}</Label>
              <select value={pMethod} onChange={(e) => setPMethod(e.target.value as 'hours')} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="hours">{t('tips.byHours')}</option>
                <option value="equal">{t('tips.equal')}</option>
              </select>
            </div>
          </div>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
            {employees.map((e) => (
              <label key={e.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
                {e.first_name} {e.last_name}
              </label>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={pending || !pTotal || selected.size === 0}
            onClick={() => run(() => distributeTipPool({ workDate: pDate, totalCents: Math.round(parseFloat(pTotal) * 100) || 0, method: pMethod, employeeIds: [...selected] }))}
          >
            {t('tips.distribute')}
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 font-semibold">{t('tips.recent')}</h2>
        {tips.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('tips.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {tips.map((tp) => {
              const emp = one(tp.employees)
              return (
                <li key={tp.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{emp ? `${emp.first_name} ${emp.last_name}` : '—'} · {money(tp.amount_cents)}</p>
                    <p className="text-muted-foreground">{tp.work_date} · {t(`tips.sources.${tp.source}` as 'tips.sources.card')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS[tp.status] ?? 'muted'}>{t(`tips.status.${tp.status}` as 'tips.status.approved')}</Badge>
                    {tp.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => approveTip(tp.id))}>{t('tips.approve')}</Button>
                        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => rejectTip(tp.id))}>{t('tips.reject')}</Button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
