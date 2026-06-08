'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Calendar, MapPin, Repeat, Hand } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { claimOpenShift, requestSwap } from '@/app/actions/scheduling'

type Shift = {
  id: string
  starts_at: string
  ends_at: string
  role_label: string | null
  status?: string
  worksites: { name: string } | { name: string }[] | null
}

function wsName(w: Shift['worksites']): string {
  const x = Array.isArray(w) ? w[0] : w
  return x?.name ?? ''
}

export function EmployeeSchedule({
  locale,
  mine,
  open,
}: {
  locale: string
  mine: Shift[]
  open: Shift[]
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function run(fn: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    setMsg(null)
    startTransition(async () => {
      const res = await fn()
      setMsg(res.success ? ok : res.error ?? 'Error')
      if (res.success) router.refresh()
    })
  }

  function fmt(s: Shift) {
    const d = new Date(s.starts_at)
    return {
      day: d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }),
      time: `${new Date(s.starts_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}–${new Date(s.ends_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`,
    }
  }

  return (
    <div className="space-y-6">
      {msg && <p className="rounded-md bg-muted p-2 text-center text-sm">{msg}</p>}

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
          <Calendar className="h-4 w-4" /> {t('schedule.upcoming')}
        </h2>
        {mine.length === 0 && <p className="text-sm text-muted-foreground">{t('schedule.noShifts')}</p>}
        <div className="space-y-2">
          {mine.map((s) => {
            const f = fmt(s)
            return (
              <div key={s.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{f.day}</p>
                    <p className="text-sm text-muted-foreground">{f.time}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1"
                    disabled={pending}
                    onClick={() => run(() => requestSwap(s.id), t('schedule.swapRequested'))}
                  >
                    <Repeat className="h-4 w-4" /> {t('schedule.swap')}
                  </Button>
                </div>
                {(s.role_label || wsName(s.worksites)) && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {[s.role_label, wsName(s.worksites)].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
          <Hand className="h-4 w-4" /> {t('schedule.openShifts')}
        </h2>
        {open.length === 0 && <p className="text-sm text-muted-foreground">{t('schedule.noOpen')}</p>}
        <div className="space-y-2">
          {open.map((s) => {
            const f = fmt(s)
            return (
              <div key={s.id} className="rounded-lg border border-warning/40 bg-warning/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{f.day}</p>
                    <p className="text-sm text-muted-foreground">{f.time}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => claimOpenShift(s.id), t('schedule.claimed'))}
                  >
                    {t('schedule.claim')}
                  </Button>
                </div>
                {(s.role_label || wsName(s.worksites)) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[s.role_label, wsName(s.worksites)].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
