'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { COMMON_TIMEZONES } from '@/lib/time/tz'
import { setOrganizationTimezone } from '@/app/actions/org-settings'

/**
 * Selector del timezone de la organización. Gobierna los cortes de día:
 * "hoy" del dashboard, fechas de propinas y splits de overtime diario.
 */
export function TimezoneSelector({ current }: { current: string }) {
  const router = useRouter()
  const [tz, setTz] = useState(current)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function save() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await setOrganizationTimezone(tz)
      if (res.success) {
        setSaved(true)
        router.refresh()
      } else {
        setError(res.error ?? 'Error')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Timezone</h2>
        <p className="text-sm text-muted-foreground">
          Day boundaries for time tracking, tips and overtime use this timezone.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="org-tz" className="text-xs">
            Organization timezone
          </Label>
          <select
            id="org-tz"
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            className="flex h-10 min-w-[16rem] rounded-md border border-input bg-background px-3 text-sm"
          >
            {COMMON_TIMEZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={save} disabled={pending || tz === current} size="sm">
          {pending ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
