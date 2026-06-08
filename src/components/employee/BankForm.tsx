'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setEmployeeBankAccount } from '@/app/actions/bank'

export function BankForm({
  current,
}: {
  current: { account_last_four: string | null; account_type: string } | null
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [routing, setRouting] = useState('')
  const [account, setAccount] = useState('')
  const [accountType, setAccountType] = useState<'checking' | 'savings'>(
    (current?.account_type as 'checking') ?? 'checking',
  )
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function submit() {
    setError(null)
    setMsg(null)
    startTransition(async () => {
      const res = await setEmployeeBankAccount({ routing, account, accountType })
      if (res.success) {
        setMsg(t('bank.saved'))
        setRouting('')
        setAccount('')
        router.refresh()
      } else setError(res.error ?? 'Error')
    })
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-5">
      {current?.account_last_four && (
        <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
          <ShieldCheck className="h-4 w-4 text-success-foreground" />
          {t('bank.onFile')}: ••••{current.account_last_four} ({t(`bank.types.${current.account_type}` as 'bank.types.checking')})
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs">{t('bank.routing')}</Label>
        <Input inputMode="numeric" value={routing} onChange={(e) => setRouting(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="123456789" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t('bank.account')}</Label>
        <Input inputMode="numeric" value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, '').slice(0, 17))} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t('bank.accountType')}</Label>
        <select value={accountType} onChange={(e) => setAccountType(e.target.value as 'checking')} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
          <option value="checking">{t('bank.types.checking')}</option>
          <option value="savings">{t('bank.types.savings')}</option>
        </select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {msg && <p className="text-sm text-success-foreground">{msg}</p>}

      <Button className="w-full" disabled={pending || routing.length !== 9 || account.length < 4} onClick={submit}>
        {pending ? t('common.loading') : t('bank.save')}
      </Button>
      <p className="text-[10px] text-muted-foreground">{t('bank.secureNote')}</p>
    </div>
  )
}
