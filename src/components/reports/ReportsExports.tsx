'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { payrollRegisterCsv, hoursReportCsv, tipsReportCsv } from '@/app/actions/reports'

type Run = { id: string; period_start: string; period_end: string; pay_date: string }

function download(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function ReportsExports({ runs }: { runs: Run[] }) {
  const t = useTranslations()
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const [runId, setRunId] = useState(runs[0]?.id ?? '')
  const [start, setStart] = useState(monthAgo)
  const [end, setEnd] = useState(today)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function go(fn: () => Promise<{ success: boolean; content?: string; filename?: string; error?: string }>) {
    setError(null)
    setBusy(true)
    const res = await fn()
    setBusy(false)
    if (res.success && res.content && res.filename) download(res.content, res.filename)
    else setError(res.error ?? 'Error')
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">{t('reports.payrollRegister')}</Label>
          <select value={runId} onChange={(e) => setRunId(e.target.value)} className="flex h-10 min-w-[12rem] rounded-md border border-input bg-background px-2 text-sm">
            {runs.length === 0 && <option value="">—</option>}
            {runs.map((r) => <option key={r.id} value={r.id}>{r.period_start} → {r.period_end}</option>)}
          </select>
        </div>
        <Button variant="outline" className="gap-1" disabled={busy || !runId} onClick={() => go(() => payrollRegisterCsv(runId))}>
          <Download className="h-4 w-4" /> CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t pt-4">
        <div className="space-y-1"><Label className="text-xs">{t('reports.from')}</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-10" /></div>
        <div className="space-y-1"><Label className="text-xs">{t('reports.to')}</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-10" /></div>
        <Button variant="outline" className="gap-1" disabled={busy} onClick={() => go(() => hoursReportCsv(start, end))}>
          <Download className="h-4 w-4" /> {t('reports.hours')}
        </Button>
        <Button variant="outline" className="gap-1" disabled={busy} onClick={() => go(() => tipsReportCsv(start, end))}>
          <Download className="h-4 w-4" /> {t('reports.tips')}
        </Button>
      </div>
    </div>
  )
}
