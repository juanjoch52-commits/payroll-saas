'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'
import { setUsesSubcontractors } from '@/app/actions/org-settings'

/**
 * ON/OFF del módulo de contratistas para la org. OFF = empresa "normal"
 * (empleados por hora/día/salario) y la sección desaparece de la navegación.
 */
export function SubcontractorsToggleCard({ current }: { current: boolean }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(current)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggle(next: boolean) {
    setError(null)
    setEnabled(next)
    startTransition(async () => {
      const res = await setUsesSubcontractors(next)
      if (!res.success) {
        setEnabled(!next)
        setError(res.error ?? 'Error')
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Contractors &amp; subcontractors</h2>
          <p className="text-sm text-muted-foreground">
            Turn this on if you pay hierarchical contractors (one consolidated check per top
            contractor, per-worker bill rates, HST and margins, contractor portal). Companies that
            simply pay their own employees hourly, daily or salaried should leave it off — nothing
            changes for them.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={toggle}
          disabled={pending}
          aria-label="Toggle subcontractors module"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
