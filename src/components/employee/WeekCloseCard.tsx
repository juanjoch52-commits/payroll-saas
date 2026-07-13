'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Clock3, RotateCcw, Send, XCircle } from 'lucide-react'
import { submitWeek } from '@/app/actions/timesheets'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Callout } from '@/components/ui/callout'
import { formatMinutes } from '@/lib/timesheets/week'

type Submission = {
  status: 'submitted' | 'approved' | 'rejected'
  submitted_at: string
  review_note: string | null
} | null

/**
 * Pie de la vista semanal del empleado: estado de la semana (en revisión /
 * aprobada / devuelta) y el botón "Cerrar semana y pedir mi pago".
 * `blockReason` viene precalculado del server (canSubmitWeek).
 */
export function WeekCloseCard({
  locale,
  weekStart,
  totalMinutes,
  canSubmit,
  blockReason,
  submission,
}: {
  locale: string
  weekStart: string
  totalMinutes: number
  canSubmit: boolean
  blockReason: 'future_week' | 'open_entry' | 'no_hours' | null
  submission: Submission
}) {
  const t = useTranslations()
  const router = useRouter()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const res = await submitWeek({ weekStart, note })
      if (res.success) {
        setNote('')
        router.refresh()
      } else {
        setError(res.error ?? 'Error')
      }
    })
  }

  // Semana ya enviada → banner por estado.
  if (submission?.status === 'submitted') {
    return (
      <Callout variant="info" icon={Clock3} title={t('myHours.submittedBanner')}>
        {t('myHours.submittedOn', {
          date: new Date(submission.submitted_at).toLocaleDateString(locale),
        })}
      </Callout>
    )
  }

  if (submission?.status === 'approved') {
    return (
      <Callout variant="success" icon={CheckCircle2} title={t('myHours.approvedBanner')}>
        {t('myHours.approvedHint')}
      </Callout>
    )
  }

  const isResubmit = submission?.status === 'rejected'

  return (
    <div className="space-y-3">
      {isResubmit && (
        <Callout variant="destructive" icon={XCircle} title={t('myHours.rejectedBanner')}>
          {submission?.review_note || t('myHours.rejectedNoNote')}
        </Callout>
      )}

      {canSubmit ? (
        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              {t('myHours.submitHint', { total: formatMinutes(totalMinutes) })}
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('myHours.submitNote')}
              maxLength={500}
              rows={2}
              className="w-full rounded-md border bg-background p-2 text-sm"
            />
            <Button size="lg" className="h-14 w-full text-base" onClick={handleSubmit} disabled={pending}>
              {isResubmit ? <RotateCcw className="mr-2 h-5 w-5" /> : <Send className="mr-2 h-5 w-5" />}
              {pending
                ? t('myHours.submitting')
                : isResubmit
                  ? t('myHours.resubmit')
                  : t('myHours.submit')}
            </Button>
            {error && (
              <p className="rounded-md border border-destructive bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        blockReason &&
        blockReason !== 'future_week' && (
          <p className="text-center text-sm text-muted-foreground">
            {blockReason === 'open_entry' ? t('myHours.blockedOpenEntry') : t('myHours.blockedNoHours')}
          </p>
        )
      )}
    </div>
  )
}
