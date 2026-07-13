'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AlertTriangle, Send } from 'lucide-react'
import { fixForgottenClockOut } from '@/app/actions/time-tracking'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

/**
 * Corrección de un clock-out olvidado: el turno lleva abierto demasiado
 * tiempo, el empleado propone fecha+hora reales de salida con motivo y queda
 * pendiente de aprobación (flageado "Manual" para el manager).
 */
export function FixClockOutForm({
  entryId,
  defaultDate,
  maxDate,
  breakPolicyActive,
}: {
  entryId: string
  /** Día local (org tz) del clock-in — default razonable de la salida. */
  defaultDate: string
  /** Hoy en el tz de la org (límite del input de fecha). */
  maxDate: string
  breakPolicyActive: boolean
}) {
  const t = useTranslations()
  const router = useRouter()
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('17:00')
  const [noBreak, setNoBreak] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const res = await fixForgottenClockOut({ entryId, date, time, noBreak, reason })
      if (res.success) {
        router.refresh()
      } else {
        setError(res.error ?? 'Error')
      }
    })
  }

  return (
    <Card className="border-warning/40">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
          <div>
            <p className="font-medium">{t('clock.forgotOutTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('clock.forgotOutHint')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="fix-date" className="text-xs">
              {t('clock.outDate')}
            </Label>
            <input
              id="fix-date"
              type="date"
              value={date}
              min={defaultDate}
              max={maxDate}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fix-time" className="text-xs">
              {t('clock.outTime')}
            </Label>
            <input
              id="fix-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-2 text-sm"
            />
          </div>
        </div>

        {breakPolicyActive && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={noBreak}
              onChange={(e) => setNoBreak(e.target.checked)}
              className="h-4 w-4"
            />
            {t('clock.noLunchShort')}
          </label>
        )}

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('clock.fixReason')}
          maxLength={500}
          rows={2}
          className="w-full rounded-md border bg-background p-2 text-sm"
        />

        <Button className="w-full" onClick={handleSubmit} disabled={pending || reason.trim().length < 3}>
          <Send className="mr-2 h-4 w-4" />
          {pending ? t('myHours.submitting') : t('clock.sendFix')}
        </Button>

        {error && (
          <p className="rounded-md border border-destructive bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
