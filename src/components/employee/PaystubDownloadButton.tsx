'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadPaystubPdf } from '@/app/actions/paystubs'

/** Botón de descarga del recibo en PDF (data URI, sin URL pública). */
export function PaystubDownloadButton({ itemId }: { itemId: string }) {
  const t = useTranslations()
  const locale = useLocale()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function download() {
    setError(null)
    startTransition(async () => {
      const res = await downloadPaystubPdf(itemId, locale)
      if (!res.success) {
        setError(res.error)
        return
      }
      const link = document.createElement('a')
      link.href = `data:application/pdf;base64,${res.base64}`
      link.download = res.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
    })
  }

  return (
    <div className="space-y-2">
      <Button onClick={download} disabled={pending} className="w-full gap-2">
        <Download className="h-4 w-4" />
        {pending ? t('common.loading') : t('paystub.download')}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
