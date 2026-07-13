'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { generateYearEndForms } from '@/app/actions/tax-forms'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export function YearEndForm() {
  const t = useTranslations()
  const router = useRouter()
  const [year, setYear] = useState<number>(new Date().getFullYear() - 1)
  const [status, setStatus] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleGenerate() {
    setStatus(null)
    startTransition(async () => {
      const res = await generateYearEndForms(year)
      if (res.success) {
        setStatus(`Generated ${res.generated.w2} W-2s and ${res.generated.form1099} 1099-NECs.`)
        router.refresh()
      } else {
        setStatus(`Error: ${res.error}`)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="taxYear">{t('reports.selectYear')}</Label>
        <select
          id="taxYear"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {Array.from({ length: 5 }).map((_, idx) => {
            const y = new Date().getFullYear() - idx
            return (
              <option key={y} value={y}>
                {y}
              </option>
            )
          })}
        </select>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleGenerate} disabled={pending}>
          {pending ? t('common.loading') : t('reports.generateW2')}
        </Button>
      </div>

      {status && <p className="text-sm">{status}</p>}
    </div>
  )
}
