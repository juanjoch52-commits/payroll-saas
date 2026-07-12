'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  downloadMySettlementsCsv,
  downloadContractorSettlementsCsv,
} from '@/app/actions/settlement'

/**
 * Descarga el CSV anual de ingresos/gastos de un contratista.
 * Sin `subcontractorId` usa la acción del CONTRATISTA logueado; con él, la del
 * manager (página de reportes de la empresa).
 */
export function SettlementsCsvButton({
  year,
  subcontractorId,
}: {
  year: number
  subcontractorId?: string
}) {
  const t = useTranslations()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload() {
    setError(null)
    setBusy(true)
    try {
      const res = subcontractorId
        ? await downloadContractorSettlementsCsv(subcontractorId, year)
        : await downloadMySettlementsCsv(year)
      if (!res.success) {
        setError(res.error)
        return
      }
      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="outline" size="sm" className="gap-1" onClick={handleDownload} disabled={busy}>
        <FileSpreadsheet className="h-3.5 w-3.5" />
        {busy ? '…' : t('contractor.csvYear', { year })}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  )
}
