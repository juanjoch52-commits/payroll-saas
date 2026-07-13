'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadSettlementPdf } from '@/app/actions/settlement'

/** Descarga el PDF de liquidación de un subcontratista raíz para un run. */
export function SettlementDownloadButton({
  runId,
  rootSubId,
}: {
  runId: string
  rootSubId: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload() {
    setError(null)
    setBusy(true)
    try {
      const res = await downloadSettlementPdf(runId, rootSubId)
      if (!res.success) {
        setError(res.error)
        return
      }
      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: 'application/pdf' })
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
        <Download className="h-3.5 w-3.5" />
        {busy ? '…' : 'PDF'}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  )
}
