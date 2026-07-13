'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  calculateRunItems,
  approvePayrollRun,
  markPayrollRunPaid,
  deletePayrollRun,
  removePayrollItem,
} from '@/app/actions/payroll'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/lib/utils'

type Employee = {
  id: string
  first_name: string
  last_name: string
  employee_type: string
  pay_schemes: { scheme_type: string; config: unknown } | { scheme_type: string; config: unknown }[]
}

type Item = {
  id: string
  employee_id: string
  gross_cents: number
  net_cents: number
  federal_tax_cents: number
  social_security_cents: number
  medicare_cents: number
}

/**
 * Tabla interactiva del payroll run.
 *
 * Por cada empleado, el manager carga horas/días/ventas según su scheme.
 * Click en "Calcular" → Server Action → recibimos los items actualizados.
 * Click en "Aprobar" cambia el status a 'approved' y bloquea ediciones.
 */
export function PayrollRunDetail({
  run,
  employees,
  items,
  locale,
}: {
  run: {
    id: string
    status: string
    period_start: string
    period_end: string
    pay_date: string
    name: string | null
  }
  employees: Employee[]
  items: Item[]
  locale: string
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [inputs, setInputs] = useState<
    Record<string, { hours?: string; days?: string; sales?: string }>
  >({})
  const [error, setError] = useState<string | null>(null)

  const isDraft = run.status === 'draft'
  const isApproved = run.status === 'approved'

  const itemByEmployee = new Map(items.map((i) => [i.employee_id, i]))

  function updateInput(empId: string, field: 'hours' | 'days' | 'sales', value: string) {
    setInputs((prev) => ({ ...prev, [empId]: { ...prev[empId], [field]: value } }))
  }

  function handleCalculate() {
    const payload = employees.map((e) => {
      const scheme = Array.isArray(e.pay_schemes) ? e.pay_schemes[0] : e.pay_schemes
      const i = inputs[e.id] ?? {}
      return {
        employeeId: e.id,
        hoursWorked: scheme?.scheme_type === 'hourly' ? parseFloat(i.hours ?? '0') : undefined,
        daysWorked: scheme?.scheme_type === 'daily' ? parseFloat(i.days ?? '0') : undefined,
        salesAmountCents:
          scheme?.scheme_type === 'commission'
            ? Math.round(parseFloat(i.sales ?? '0') * 100)
            : undefined,
      }
    })

    startTransition(async () => {
      const res = await calculateRunItems(run.id, payload)
      if (!res.success) setError(res.error ?? 'Error')
      else {
        setError(null)
        router.refresh()
      }
    })
  }

  function handleApprove() {
    startTransition(async () => {
      const res = await approvePayrollRun(run.id)
      if (!res.success) setError(res.error ?? 'Error')
      else router.refresh()
    })
  }

  function handleMarkPaid() {
    startTransition(async () => {
      const res = await markPayrollRunPaid(run.id)
      if (!res.success) setError(res.error ?? 'Error')
      else router.refresh()
    })
  }

  function handleDeleteRun() {
    if (!confirm('Delete this draft run? Consumed time/production/tips will be released.')) return
    startTransition(async () => {
      const res = await deletePayrollRun(run.id)
      if (!res.success) setError(res.error ?? 'Error')
      else router.push(`/${locale}/payroll`)
    })
  }

  function handleRemoveItem(itemId: string) {
    startTransition(async () => {
      const res = await removePayrollItem(run.id, itemId)
      if (!res.success) setError(res.error ?? 'Error')
      else router.refresh()
    })
  }

  const totalGross = items.reduce((sum, i) => sum + i.gross_cents, 0)
  const totalNet = items.reduce((sum, i) => sum + i.net_cents, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {run.name ?? `${run.period_start} → ${run.period_end}`}
          </h1>
          <p className="text-muted-foreground">
            Pay date: {run.pay_date} · <span className="capitalize">{run.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <Button variant="outline" onClick={handleCalculate} disabled={pending}>
              Calculate
            </Button>
          )}
          {isDraft && items.length > 0 && (
            <Button onClick={handleApprove} disabled={pending}>
              {t('payroll.approve')}
            </Button>
          )}
          {isApproved && (
            <Button onClick={handleMarkPaid} disabled={pending}>
              {t('payroll.markPaid')}
            </Button>
          )}
          {isDraft && (
            <Button variant="outline" onClick={handleDeleteRun} disabled={pending} className="text-destructive">
              {t('common.delete')}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{formatMoney(totalGross, locale)}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('payroll.grossPay')}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{formatMoney(totalNet, locale)}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('payroll.netPay')}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{employees.length}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('payroll.employeesCount')}</p>
          </CardHeader>
        </Card>
      </div>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Scheme</th>
              <th className="px-4 py-3 font-medium">Input</th>
              <th className="px-4 py-3 font-medium text-right">Gross</th>
              <th className="px-4 py-3 font-medium text-right">Taxes</th>
              <th className="px-4 py-3 font-medium text-right">Net</th>
              <th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const scheme = Array.isArray(e.pay_schemes) ? e.pay_schemes[0] : e.pay_schemes
              const item = itemByEmployee.get(e.id)
              const taxes =
                (item?.federal_tax_cents ?? 0) +
                (item?.social_security_cents ?? 0) +
                (item?.medicare_cents ?? 0)
              const input = inputs[e.id] ?? {}

              return (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {e.first_name} {e.last_name}
                  </td>
                  <td className="px-4 py-3">
                    {scheme &&
                      t(
                        `employees.schemes.${scheme.scheme_type as 'hourly'}` as 'employees.schemes.hourly',
                      )}
                  </td>
                  <td className="px-4 py-3">
                    {scheme?.scheme_type === 'hourly' && (
                      <Input
                        type="number"
                        step="0.5"
                        className="h-8 w-24"
                        value={input.hours ?? ''}
                        placeholder="Hours"
                        onChange={(ev) => updateInput(e.id, 'hours', ev.target.value)}
                        disabled={!isDraft}
                      />
                    )}
                    {scheme?.scheme_type === 'daily' && (
                      <Input
                        type="number"
                        step="0.5"
                        className="h-8 w-24"
                        value={input.days ?? ''}
                        placeholder="Days"
                        onChange={(ev) => updateInput(e.id, 'days', ev.target.value)}
                        disabled={!isDraft}
                      />
                    )}
                    {scheme?.scheme_type === 'commission' && (
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 w-32"
                        value={input.sales ?? ''}
                        placeholder="Sales $"
                        onChange={(ev) => updateInput(e.id, 'sales', ev.target.value)}
                        disabled={!isDraft}
                      />
                    )}
                    {scheme?.scheme_type === 'salary' && (
                      <span className="text-muted-foreground">Auto</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item ? formatMoney(item.gross_cents, locale) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {item ? formatMoney(taxes, locale) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {item ? formatMoney(item.net_cents, locale) : '—'}
                  </td>
                  <td className="px-2 py-3 text-right">
                    {isDraft && item && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem((item as unknown as { id: string }).id)}
                        disabled={pending}
                        aria-label={`Remove ${e.first_name} from this run`}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {employees.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  No active employees. Add some first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
