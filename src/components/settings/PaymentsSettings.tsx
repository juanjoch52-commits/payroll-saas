'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Landmark, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setCompanyBankAccount, generatePayrollAch } from '@/app/actions/bank'

type Run = { id: string; period_start: string; period_end: string; pay_date: string }

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function PaymentsSettings({
  encryptionReady,
  company,
  runs,
}: {
  encryptionReady: boolean
  company: { company_name: string | null; company_id: string | null; account_last_four: string | null } | null
  runs: Run[]
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [companyName, setCompanyName] = useState(company?.company_name ?? '')
  const [companyId, setCompanyId] = useState(company?.company_id ?? '')
  const [routing, setRouting] = useState('')
  const [account, setAccount] = useState('')
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking')

  function saveCompany() {
    setError(null)
    setMsg(null)
    startTransition(async () => {
      const res = await setCompanyBankAccount({ routing, account, accountType, companyName, companyId })
      if (res.success) {
        setMsg(t('bank.saved'))
        setRouting('')
        setAccount('')
        router.refresh()
      } else setError(res.error ?? 'Error')
    })
  }

  async function downloadAch(runId: string) {
    setError(null)
    setMsg(null)
    const res = await generatePayrollAch(runId)
    if (res.success) {
      downloadText(res.content, res.filename)
      if (res.missing > 0) setMsg(t('bank.missingNote', { n: res.missing }))
    } else setError(res.error)
  }

  return (
    <div className="space-y-6">
      {!encryptionReady && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
          {t('bank.encNote')}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {msg && <p className="text-sm text-success-foreground">{msg}</p>}

      {/* Cuenta de la empresa */}
      <section className="space-y-3 rounded-lg border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Landmark className="h-5 w-5" /> {t('bank.companyAccount')}
        </h2>
        {company?.account_last_four && (
          <p className="text-sm text-muted-foreground">{t('bank.onFile')}: ••••{company.account_last_four}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-xs">{t('bank.companyName')}</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{t('bank.companyId')}</Label><Input value={companyId} onChange={(e) => setCompanyId(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="EIN / NACHA id" /></div>
          <div className="space-y-1"><Label className="text-xs">{t('bank.routing')}</Label><Input inputMode="numeric" value={routing} onChange={(e) => setRouting(e.target.value.replace(/\D/g, '').slice(0, 9))} /></div>
          <div className="space-y-1"><Label className="text-xs">{t('bank.account')}</Label><Input inputMode="numeric" value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, '').slice(0, 17))} /></div>
          <div className="space-y-1">
            <Label className="text-xs">{t('bank.accountType')}</Label>
            <select value={accountType} onChange={(e) => setAccountType(e.target.value as 'checking')} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="checking">{t('bank.types.checking')}</option>
              <option value="savings">{t('bank.types.savings')}</option>
            </select>
          </div>
        </div>
        <Button disabled={pending || routing.length !== 9 || account.length < 4 || !companyName.trim() || !companyId} onClick={saveCompany}>
          {t('bank.save')}
        </Button>
      </section>

      {/* Generar ACH por nómina */}
      <section className="space-y-2 rounded-lg border bg-card p-5">
        <h2 className="font-semibold">{t('bank.achTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('bank.achHint')}</p>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('bank.noRuns')}</p>
        ) : (
          <ul className="space-y-2">
            {runs.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{r.period_start} → {r.period_end}</span>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadAch(r.id)}>
                  <Download className="h-4 w-4" /> {t('bank.downloadAch')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
