'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { requestTimeOff, cancelTimeOff } from '@/app/actions/time-off'

type Balance = { balance_hours: number; pto_policies: { name: string; pto_type: string } | { name: string; pto_type: string }[] | null }
type Policy = { id: string; name: string }
type Req = { id: string; start_date: string; end_date: string; hours: number; status: string }

const STATUS: Record<string, 'success' | 'warning' | 'destructive' | 'muted'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'destructive',
  cancelled: 'muted',
}
function one<T>(x: T | T[] | null): T | null {
  return Array.isArray(x) ? x[0] ?? null : x
}

export function MyTimeOff({
  balances,
  policies,
  requests,
}: {
  balances: Balance[]
  policies: Policy[]
  requests: Req[]
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [policyId, setPolicyId] = useState(policies[0]?.id ?? '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [hours, setHours] = useState('8')
  const [reason, setReason] = useState('')

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.success) router.refresh()
      else setError(res.error ?? 'Error')
    })
  }

  function submit() {
    run(() => requestTimeOff({ policyId, startDate, endDate, hours: Number(hours) || 0, reason }))
  }

  return (
    <div className="space-y-6">
      {/* Saldos */}
      {balances.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {balances.map((b, i) => {
            const p = one(b.pto_policies)
            return (
              <div key={i} className="rounded-lg border bg-card p-3 text-center">
                <p className="text-2xl font-bold">{Number(b.balance_hours).toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">{p?.name ?? '—'}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Solicitar */}
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="font-semibold">{t('timeOff.request')}</h2>
        {policies.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">{t('timeOff.policy')}</Label>
            <select value={policyId} onChange={(e) => setPolicyId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
              {policies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label className="text-xs">{t('timeOff.from')}</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{t('timeOff.to')}</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>
        <div className="space-y-1"><Label className="text-xs">{t('timeOff.hours')}</Label><Input type="number" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">{t('timeOff.reason')}</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={pending || !startDate || !endDate} onClick={submit}>
          {pending ? t('common.loading') : t('timeOff.submit')}
        </Button>
      </div>

      {/* Mis solicitudes */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">{t('timeOff.myRequests')}</h2>
        {requests.length === 0 && <p className="text-sm text-muted-foreground">{t('timeOff.noRequests')}</p>}
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-md border bg-card p-3 text-sm">
              <div>
                <p className="font-medium">{r.start_date} → {r.end_date}</p>
                <p className="text-xs text-muted-foreground">{r.hours}h</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS[r.status] ?? 'muted'}>{t(`timeOff.status.${r.status}` as 'timeOff.status.approved')}</Badge>
                {r.status === 'pending' && (
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => cancelTimeOff(r.id))}>
                    {t('common.cancel')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
