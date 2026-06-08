'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportTenantData } from '@/app/actions/data-export'

/**
 * Botón de export de datos del tenant (GDPR/CCPA). Llama a la Server Action,
 * que devuelve un JSON, y lo descarga como archivo en el navegador.
 */
export function DataExportCard() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setError(null)
    setBusy(true)
    try {
      const res = await exportTenantData()
      if (!res.success) {
        setError(res.error)
        return
      }
      const blob = new Blob([res.content], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('No se pudo generar el export.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Data export</h2>
        <p className="text-sm text-muted-foreground">
          Download all of your organization&apos;s business data (employees, payroll, time, PTO,
          and more) as a single JSON file. Encrypted credentials and stored files are excluded.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button variant="outline" className="gap-2" onClick={handleExport} disabled={busy}>
        <Download className="h-4 w-4" />
        {busy ? 'Preparing…' : 'Export data (JSON)'}
      </Button>
    </div>
  )
}
