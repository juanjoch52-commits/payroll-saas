'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { addDeduction, removeDeduction } from '@/app/actions/deductions'

type Employee = { id: string; first_name: string; last_name: string }
type Deduction = {
  id: string
  employee_id: string
  label: string
  code: string
  amount_cents: number
  pre_tax: boolean
}

export function DeductionsManager({
  employees,
  deductions,
}: {
  employees: Employee[]
  deductions: Deduction[]
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '')
  const [label, setLabel] = useState('')
  const [code, setCode] = useState('')
  const [amount, setAmount] = useState('')
  const [preTax, setPreTax] = useState(false)

  const theirs = useMemo(
    () => deductions.filter((d) => d.employee_id === employeeId),
    [deductions, employeeId],
  )

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.success) router.refresh()
      else setError(res.error ?? 'Error')
    })
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-1 rounded-lg border bg-card p-4">
        <Label className="text-xs">{t('deductions.employee')}</Label>
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm sm:max-w-xs">
          {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
        </select>

        <div className="mt-3 grid gap-3 sm:grid-cols-5">
          <div className="space-y-1"><Label className="text-xs">{t('deductions.label')}</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Health" /></div>
          <div className="space-y-1"><Label className="text-xs">{t('deductions.code')}</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="health" /></div>
          <div className="space-y-1"><Label className="text-xs">{t('deductions.amount')}</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={preTax} onChange={(e) => setPreTax(e.target.checked)} /> {t('deductions.preTax')}</label>
          <div className="flex items-end">
            <Button className="w-full gap-1" disabled={pending || !employeeId || !label.trim() || !amount} onClick={() => run(() => addDeduction({ employeeId, label, code: code || label.toLowerCase(), amountCents: Math.round(parseFloat(amount) * 100) || 0, preTax }))}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 font-semibold">{t('deductions.current')}</h2>
        {theirs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('deductions.none')}</p>
        ) : (
          <ul className="space-y-2">
            {theirs.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  {d.label} · ${(d.amount_cents / 100).toFixed(2)}
                  {d.pre_tax && <Badge variant="info">{t('deductions.preTax')}</Badge>}
                </span>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => removeDeduction(d.id))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
