'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  recordProductionEntry,
  approveProductionEntry,
  rejectProductionEntry,
} from '@/app/actions/production'

type SchemeConfig = { type?: string; ratePerUnitCents?: number; unitLabel?: string }
type PaySchemeRow = { scheme_type: string; config: SchemeConfig }
type Employee = {
  id: string
  first_name: string
  last_name: string
  pay_schemes: PaySchemeRow | PaySchemeRow[]
}
type PersonRef = { first_name: string; last_name: string }
type Entry = {
  id: string
  work_date: string
  unit_code: string
  unit_label: string | null
  quantity: number | string
  rate_per_unit_cents: number | null
  status: 'open' | 'pending' | 'approved' | 'rejected' | 'edited'
  payroll_item_id: string | null
  employees: PersonRef | PersonRef[]
}

function schemeOf(e: Employee): SchemeConfig {
  const ps = Array.isArray(e.pay_schemes) ? e.pay_schemes[0] : e.pay_schemes
  return ps?.config ?? {}
}
function nameOf(x: PersonRef | PersonRef[]): string {
  const n = Array.isArray(x) ? x[0] : x
  return n ? `${n.first_name} ${n.last_name}` : ''
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'muted' | 'info'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'destructive',
  edited: 'info',
  open: 'muted',
}

export function ProductionPanel({
  employees,
  entries,
}: {
  locale: string
  employees: Employee[]
  entries: Entry[]
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  const [employeeId, setEmployeeId] = useState<string>(employees[0]?.id ?? '')
  const selected = useMemo(() => employees.find((e) => e.id === employeeId), [employees, employeeId])
  const scheme = selected ? schemeOf(selected) : {}

  const [workDate, setWorkDate] = useState(today)
  const [quantity, setQuantity] = useState('')
  const [unitLabel, setUnitLabel] = useState(scheme.unitLabel ?? 'unit')
  const [rateDollars, setRateDollars] = useState(
    scheme.ratePerUnitCents ? (scheme.ratePerUnitCents / 100).toString() : '',
  )

  function onEmployeeChange(id: string) {
    setEmployeeId(id)
    const emp = employees.find((e) => e.id === id)
    const sc = emp ? schemeOf(emp) : {}
    setUnitLabel(sc.unitLabel ?? 'unit')
    setRateDollars(sc.ratePerUnitCents ? (sc.ratePerUnitCents / 100).toString() : '')
  }

  function submit(formData: FormData) {
    setError(null)
    formData.set('employeeId', employeeId)
    formData.set('workDate', workDate)
    formData.set('unitCode', unitLabel.trim() || 'unit')
    formData.set('unitLabel', unitLabel.trim() || 'unit')
    formData.set('quantity', quantity)
    if (rateDollars.trim()) {
      formData.set('ratePerUnitCents', String(Math.round(parseFloat(rateDollars) * 100)))
    }
    startTransition(async () => {
      const res = await recordProductionEntry(formData)
      if (res.success) {
        setQuantity('')
        router.refresh()
      } else {
        setError(res.error ?? 'Error')
      }
    })
  }

  function act(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.success) router.refresh()
      else setError(res.error ?? 'Error')
    })
  }

  if (employees.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        {t('production.noEmployees')}
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Formulario de registro */}
      <form action={submit} className="space-y-4 rounded-lg border bg-card p-5">
        <h2 className="font-semibold">{t('production.recordTitle')}</h2>
        <div className="space-y-2">
          <Label>{t('production.employee')}</Label>
          <select
            value={employeeId}
            onChange={(e) => onEmployeeChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.first_name} {e.last_name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('production.date')}</Label>
            <Input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('production.quantity')}</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t('production.unitLabel')}</Label>
            <Input value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('production.ratePerUnit')}</Label>
            <Input
              type="number"
              step="0.01"
              value={rateDollars}
              onChange={(e) => setRateDollars(e.target.value)}
              placeholder={t('production.rateHint')}
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending || !employeeId}>
          {pending ? t('common.loading') : t('production.record')}
        </Button>
      </form>

      {/* Lista de entries recientes */}
      <div className="space-y-3 rounded-lg border bg-card p-5">
        <h2 className="font-semibold">{t('production.recent')}</h2>
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('production.empty')}</p>
        )}
        <ul className="space-y-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{nameOf(e.employees)}</p>
                <p className="truncate text-muted-foreground">
                  {e.work_date} · {Number(e.quantity)} {e.unit_label ?? e.unit_code}
                  {e.rate_per_unit_cents
                    ? ` · $${(e.rate_per_unit_cents / 100).toFixed(2)}/u`
                    : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={STATUS_VARIANT[e.status] ?? 'muted'}>
                  {t(`production.status.${e.status}` as 'production.status.pending')}
                </Badge>
                {(e.status === 'pending' || e.status === 'edited') && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => act(() => approveProductionEntry(e.id))}
                      disabled={pending}
                    >
                      {t('production.approve')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => act(() => rejectProductionEntry(e.id))}
                      disabled={pending}
                    >
                      {t('production.reject')}
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
