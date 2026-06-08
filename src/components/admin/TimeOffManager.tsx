'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  createPtoPolicy,
  deletePtoPolicy,
  respondTimeOff,
} from '@/app/actions/time-off'

type Person = { first_name: string; last_name: string }
type Policy = {
  id: string
  name: string
  pto_type: string
  paid: boolean
  accrual_method: string
  accrual_rate: number
  max_balance_hours: number | null
}
type Req = {
  id: string
  start_date: string
  end_date: string
  hours: number
  reason: string | null
  status: string
  employees: Person | Person[] | null
  pto_policies: { name: string } | { name: string }[] | null
}

const STATUS: Record<string, 'success' | 'warning' | 'destructive' | 'muted'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'destructive',
  cancelled: 'muted',
}
function one<T>(x: T | T[] | null): T | null {
  return Array.isArray(x) ? x[0] ?? null : x
}

export function TimeOffManager({
  role,
  policies,
  requests,
}: {
  role: string
  policies: Policy[]
  requests: Req[]
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isAdmin = role === 'owner' || role === 'admin'

  const [name, setName] = useState('')
  const [ptoType, setPtoType] = useState('vacation')
  const [paid, setPaid] = useState('true')

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.success) router.refresh()
      else setError(res.error ?? 'Error')
    })
  }

  const pendingReqs = requests.filter((r) => r.status === 'pending')
  const otherReqs = requests.filter((r) => r.status !== 'pending')

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Solicitudes pendientes */}
      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 font-semibold">{t('timeOff.pending')} ({pendingReqs.length})</h2>
        {pendingReqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('timeOff.noPending')}</p>
        ) : (
          <ul className="space-y-2">
            {pendingReqs.map((r) => {
              const emp = one(r.employees)
              const pol = one(r.pto_policies)
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{emp ? `${emp.first_name} ${emp.last_name}` : '—'}</p>
                    <p className="text-muted-foreground">
                      {r.start_date} → {r.end_date} · {r.hours}h{pol ? ` · ${pol.name}` : ''}
                      {r.reason ? ` · ${r.reason}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => respondTimeOff(r.id, true))}>
                      {t('timeOff.approve')}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => respondTimeOff(r.id, false))}>
                      {t('timeOff.reject')}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Políticas */}
      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 font-semibold">{t('timeOff.policies')}</h2>
        {isAdmin && (
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">{t('timeOff.policyName')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vacaciones" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('timeOff.type')}</Label>
              <select value={ptoType} onChange={(e) => setPtoType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="vacation">{t('timeOff.types.vacation')}</option>
                <option value="sick">{t('timeOff.types.sick')}</option>
                <option value="personal">{t('timeOff.types.personal')}</option>
                <option value="unpaid">{t('timeOff.types.unpaid')}</option>
                <option value="other">{t('timeOff.types.other')}</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('timeOff.paid')}</Label>
              <select value={paid} onChange={(e) => setPaid(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="true">{t('common.yes')}</option>
                <option value="false">{t('common.no')}</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full gap-1"
                disabled={pending || !name.trim()}
                onClick={() => run(() => createPtoPolicy({ name, ptoType: ptoType as 'vacation', paid: paid === 'true' }))}
              >
                <Plus className="h-4 w-4" /> {t('common.create')}
              </Button>
            </div>
          </div>
        )}
        <ul className="space-y-2">
          {policies.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span className="font-medium">
                {p.name} <Badge variant="muted">{t(`timeOff.types.${p.pto_type}` as 'timeOff.types.vacation')}</Badge>{' '}
                {p.paid ? <Badge variant="success">{t('timeOff.paid')}</Badge> : <Badge variant="muted">{t('timeOff.unpaidTag')}</Badge>}
              </span>
              {isAdmin && (
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deletePtoPolicy(p.id))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
          {policies.length === 0 && <li className="text-sm text-muted-foreground">{t('timeOff.noPolicies')}</li>}
        </ul>
      </section>

      {/* Histórico */}
      {otherReqs.length > 0 && (
        <section className="rounded-lg border bg-card p-5">
          <h2 className="mb-3 font-semibold">{t('timeOff.history')}</h2>
          <ul className="space-y-1.5">
            {otherReqs.slice(0, 20).map((r) => {
              const emp = one(r.employees)
              return (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span>{emp ? `${emp.first_name} ${emp.last_name}` : '—'} · {r.start_date} → {r.end_date}</span>
                  <Badge variant={STATUS[r.status] ?? 'muted'}>{t(`timeOff.status.${r.status}` as 'timeOff.status.approved')}</Badge>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
