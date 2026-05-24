'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createPayrollRun } from '@/app/actions/payroll'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function NewPayrollRunForm({ locale }: { locale: string }) {
  const t = useTranslations()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await createPayrollRun(formData)
      if (res.success) {
        router.push(`/${locale}/payroll/${res.runId}`)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name (optional)</Label>
        <Input id="name" name="name" placeholder="Week 12 — Mar 16-29" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="periodStart">{t('payroll.periodStart')}</Label>
          <Input id="periodStart" name="periodStart" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="periodEnd">{t('payroll.periodEnd')}</Label>
          <Input id="periodEnd" name="periodEnd" type="date" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payDate">{t('payroll.payDate')}</Label>
        <Input id="payDate" name="payDate" type="date" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="jurisdictionCode">{t('employees.jurisdiction')}</Label>
        <select
          id="jurisdictionCode"
          name="jurisdictionCode"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue="US"
        >
          <option value="US">US — Federal</option>
          <option value="CA">CA — Federal (Canada)</option>
        </select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? t('common.loading') : t('common.create')}
        </Button>
      </div>
    </form>
  )
}
