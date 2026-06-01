'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Plug, Lock, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  connectQuickBooks,
  disconnectQuickBooks,
  setAccountMapping,
  syncPayrollRunNow,
  syncEmployeesNow,
  exportPayrollIif,
  exportPayrollCsv,
} from '@/app/actions/quickbooks'

type Mapping = {
  wageExpense?: string
  cash?: string
  federalLiability?: string
  ssLiability?: string
  medicareLiability?: string
  stateLiability?: string
}
type Run = { id: string; period_start: string; period_end: string; pay_date: string; status: string }

const FIELDS: { key: keyof Mapping; label: string }[] = [
  { key: 'wageExpense', label: 'Wage expense' },
  { key: 'cash', label: 'Cash / Checking' },
  { key: 'federalLiability', label: 'Federal tax payable' },
  { key: 'ssLiability', label: 'Social Security payable' },
  { key: 'medicareLiability', label: 'Medicare payable' },
  { key: 'stateLiability', label: 'State tax payable' },
]

function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function QuickBooksCard({
  locale,
  hasFeature,
  serverConfigured,
  status,
  lastSyncedAt,
  lastError,
  accountMapping,
  runs,
}: {
  locale: string
  hasFeature: boolean
  serverConfigured: boolean
  status: string | null
  lastSyncedAt: string | null
  lastError: string | null
  accountMapping: Mapping | null
  runs: Run[]
}) {
  const t = useTranslations()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [mapping, setMapping] = useState<Mapping>(accountMapping ?? {})
  const connected = status === 'active'

  function run(fn: () => Promise<{ success: boolean; error?: string; message?: string }>) {
    setMsg(null)
    setErr(null)
    startTransition(async () => {
      const res = await fn()
      if (res.success) setMsg(res.message ?? t('common.saved'))
      else setErr(res.error ?? 'Error')
    })
  }

  function connect() {
    setErr(null)
    startTransition(async () => {
      const res = await connectQuickBooks(locale)
      if (res.success) window.location.href = res.url
      else setErr(res.error)
    })
  }

  async function doExport(kind: 'iif' | 'csv', runId: string) {
    setErr(null)
    const res = kind === 'iif' ? await exportPayrollIif(runId) : await exportPayrollCsv(runId)
    if (res.success) {
      downloadText(res.content, res.filename, kind === 'iif' ? 'application/octet-stream' : 'text/csv')
    } else {
      setErr(res.error)
    }
  }

  if (!hasFeature) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                QuickBooks Online
              </CardTitle>
              <CardDescription>{t('quickbooks.desc')}</CardDescription>
            </div>
            <Badge variant="warning" className="gap-1">
              <Lock className="h-3 w-3" />
              {t('quickbooks.planTag')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button disabled>{t('quickbooks.upgrade')}</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              QuickBooks Online
            </CardTitle>
            <CardDescription>{t('quickbooks.desc')}</CardDescription>
          </div>
          <Badge variant={connected ? 'success' : 'muted'}>
            {connected ? t('quickbooks.connected') : t('quickbooks.notConnected')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!serverConfigured && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
            {t('quickbooks.serverNote')}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          {connected ? (
            <Button variant="outline" onClick={() => run(disconnectQuickBooks)} disabled={pending}>
              {t('quickbooks.disconnect')}
            </Button>
          ) : (
            <Button onClick={connect} disabled={pending || !serverConfigured}>
              {t('quickbooks.connect')}
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => run(syncEmployeesNow)}
            disabled={pending}
          >
            <Users className="h-4 w-4" />
            {t('quickbooks.syncEmployees')}
          </Button>
        </div>

        {lastSyncedAt && (
          <p className="text-xs text-muted-foreground">
            {t('quickbooks.lastSync')}: {new Date(lastSyncedAt).toLocaleString(locale)}
          </p>
        )}
        {lastError && <p className="text-xs text-destructive">{lastError}</p>}
        {msg && <p className="text-sm text-success-foreground">{msg}</p>}
        {err && <p className="text-sm text-destructive">{err}</p>}

        {/* Mapeo de cuentas */}
        <div className="space-y-3 border-t pt-4">
          <div>
            <p className="font-medium">{t('quickbooks.accountMapping')}</p>
            <p className="text-xs text-muted-foreground">{t('quickbooks.mappingHint')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                <Input
                  value={mapping[f.key] ?? ''}
                  onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                  placeholder="QBO account ID"
                />
              </div>
            ))}
          </div>
          <Button size="sm" onClick={() => run(() => setAccountMapping(mapping))} disabled={pending}>
            {t('common.save')}
          </Button>
        </div>

        {/* Runs recientes: sync / export */}
        <div className="space-y-2 border-t pt-4">
          <p className="font-medium">{t('quickbooks.recentRuns')}</p>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('quickbooks.noRuns')}</p>
          ) : (
            <ul className="space-y-2">
              {runs.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span>
                    {r.period_start} → {r.period_end}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => run(() => syncPayrollRunNow(r.id))}
                      disabled={pending}
                    >
                      {t('quickbooks.sync')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => doExport('iif', r.id)}>
                      IIF
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => doExport('csv', r.id)}>
                      CSV
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
