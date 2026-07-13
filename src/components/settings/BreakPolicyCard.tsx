'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { setBreakPolicy } from '@/app/actions/org-settings'

/**
 * Política de descanso no pagado de la org: descontar N minutos de almuerzo
 * cuando el turno alcanza el umbral. Turnos cortos (medio día) no descuentan;
 * el empleado puede declarar "no lunch" al salir y queda flageado.
 */
export function BreakPolicyCard({
  currentMinutes,
  currentThresholdMinutes,
  currentShiftMinutes = 480,
}: {
  currentMinutes: number
  currentThresholdMinutes: number
  /** Jornada estándar en minutos (contador del reloj del empleado; 0 = off). */
  currentShiftMinutes?: number
}) {
  const router = useRouter()
  const [minutes, setMinutes] = useState(String(currentMinutes))
  const [thresholdHours, setThresholdHours] = useState(String(currentThresholdMinutes / 60))
  const [shiftHours, setShiftHours] = useState(String(currentShiftMinutes / 60))
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty =
    minutes !== String(currentMinutes) ||
    thresholdHours !== String(currentThresholdMinutes / 60) ||
    shiftHours !== String(currentShiftMinutes / 60)

  function save() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await setBreakPolicy(
        Math.round(Number(minutes) || 0),
        Math.round((Number(thresholdHours) || 0) * 60),
        Math.round((Number(shiftHours) || 0) * 60),
      )
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
        <h2 className="text-lg font-semibold">Shift &amp; lunch rules</h2>
        <p className="text-sm text-muted-foreground">
          The standard shift powers the worker&apos;s clock counter (&quot;2 h left to complete
          your 8 h&quot; and estimated leave time — informative, it never blocks clock out). The
          unpaid lunch is deducted automatically only from shifts that reach the threshold; short
          (half-day) shifts keep their hours, and workers can flag &quot;I didn&apos;t take a
          lunch&quot; at clock out for your review. Set 0 to disable either.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="shift-hours" className="text-xs">
            Standard shift (hours)
          </Label>
          <input
            id="shift-hours"
            type="number"
            min={0}
            max={16}
            step={0.5}
            value={shiftHours}
            onChange={(e) => setShiftHours(e.target.value)}
            className="flex h-10 w-28 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="break-min" className="text-xs">
            Deduction (minutes)
          </Label>
          <input
            id="break-min"
            type="number"
            min={0}
            max={120}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="flex h-10 w-28 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="break-threshold" className="text-xs">
            Only when shift reaches (hours)
          </Label>
          <input
            id="break-threshold"
            type="number"
            min={0}
            max={12}
            step={0.5}
            value={thresholdHours}
            onChange={(e) => setThresholdHours(e.target.value)}
            className="flex h-10 w-28 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <Button onClick={save} disabled={pending || !dirty} size="sm">
          {pending ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Example: 8 h shift + 30 min lunch once the shift reaches 6 h → the clock shows the worker
        an estimated leave time of 8 h 30 min after clock in. A 4 h half day keeps its full hours.
        Applies to future clock outs only.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
