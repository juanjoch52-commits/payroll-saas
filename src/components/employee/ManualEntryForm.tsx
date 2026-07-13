'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CalendarPlus, Send, X } from 'lucide-react'
import { addManualEntry } from '@/app/actions/time-tracking'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

/**
 * "¿Olvidaste fichar?" — el empleado reporta un turno completo a mano
 * (fecha + entrada + salida + motivo). Entra 'pending' flageado "Manual".
 */
export function ManualEntryForm({
  maxDate,
  breakPolicyActive,
}: {
  /** Hoy en el tz de la org (límite del input de fecha). */
  maxDate: string
  breakPolicyActive: boolean
}) {
  const t = useTranslations()
  const router = useRouter()
  const [openForm, setOpenForm] = useState(false)
  const [date, setDate] = useState(maxDate)
  const [timeIn, setTimeIn] = useState('08:00')
  const [timeOut, setTimeOut] = useState('17:00')
  const [noBreak, setNoBreak] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const res = await addManualEntry({ date, timeIn, timeOut, noBreak, reason })
      if (res.success) {
        setDone(true)
        setOpenForm(false)
        setReason('')
        router.refresh()
      } else {
        setError(res.error ?? 'Error')
      }
    })
  }

  if (!openForm) {
    return (
      <div className="space-y-2">
        {done && (
          <p className="rounded-md border border-success/40 bg-success/10 p-2 text-center text-sm text-success-foreground">
            {t('myHours.manualSent')}
          </p>
        )}
        <button
          onClick={() => {
            setDone(false)
            setOpenForm(true)
          }}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <CalendarPlus className="h-4 w-4" />
          {t('myHours.manualTitle')}
        </button>
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">{t('myHours.manualTitle')}</p>
          <button onClick={() => setOpenForm(false)} aria-label={t('common.cancel')}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{t('myHours.manualHint')}</p>

        <div className="space-y-1">
          <Label htmlFor="me-date" className="text-xs">
            {t('myHours.manualDate')}
          </Label>
          <input
            id="me-date"
            type="date"
            value={date}
            max={maxDate}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 w-full rounded-md border bg-background px-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="me-in" className="text-xs">
              {t('timeTracking.clockInAt')}
            </Label>
            <input
              id="me-in"
              type="time"
              value={timeIn}
              onChange={(e) => setTimeIn(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="me-out" className="text-xs">
              {t('timeTracking.clockOutAt')}
            </Label>
            <input
              id="me-out"
              type="time"
              value={timeOut}
              onChange={(e) => setTimeOut(e.target.value)}
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
          placeholder={t('myHours.manualReason')}
          maxLength={500}
          rows={2}
          className="w-full rounded-md border bg-background p-2 text-sm"
        />

        <Button className="w-full" onClick={handleSubmit} disabled={pending || reason.trim().length < 3}>
          <Send className="mr-2 h-4 w-4" />
          {pending ? t('myHours.submitting') : t('myHours.manualSubmit')}
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
