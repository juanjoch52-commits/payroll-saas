'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateMyProfile } from '@/app/actions/profile'

type Addr = { line1?: string | null; city?: string | null; region?: string | null; postalCode?: string | null }

export function MyProfileEdit({
  phone,
  address,
}: {
  phone: string | null
  address: Addr | null
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [p, setP] = useState(phone ?? '')
  const [line1, setLine1] = useState(address?.line1 ?? '')
  const [city, setCity] = useState(address?.city ?? '')
  const [region, setRegion] = useState(address?.region ?? '')
  const [postal, setPostal] = useState(address?.postalCode ?? '')

  function save() {
    setError(null)
    setMsg(null)
    startTransition(async () => {
      const res = await updateMyProfile({ phone: p, addressLine1: line1, city, region, postalCode: postal })
      if (res.success) {
        setMsg(t('common.saved'))
        router.refresh()
      } else setError(res.error ?? 'Error')
    })
  }

  if (!open) {
    return (
      <Button variant="outline" className="mt-4 w-full" onClick={() => setOpen(true)}>
        {t('profileEdit.edit')}
      </Button>
    )
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border bg-card p-4">
      <div className="space-y-1"><Label className="text-xs">{t('profileEdit.phone')}</Label><Input value={p} onChange={(e) => setP(e.target.value)} /></div>
      <div className="space-y-1"><Label className="text-xs">{t('profileEdit.address')}</Label><Input value={line1} onChange={(e) => setLine1(e.target.value)} /></div>
      <div className="grid grid-cols-3 gap-2">
        <Input placeholder={t('profileEdit.city')} value={city} onChange={(e) => setCity(e.target.value)} />
        <Input placeholder={t('profileEdit.region')} value={region} onChange={(e) => setRegion(e.target.value)} />
        <Input placeholder={t('profileEdit.postal')} value={postal} onChange={(e) => setPostal(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {msg && <p className="text-sm text-success-foreground">{msg}</p>}
      <div className="flex gap-2">
        <Button disabled={pending} onClick={save}>{t('common.save')}</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
      </div>
    </div>
  )
}
