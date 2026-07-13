'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Check, ChevronRight, PlayCircle, X } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { dismissOnboarding } from '@/app/actions/onboarding'
import { useTourStore } from './tourStore'

export type ChecklistStep = { key: string; href: string; done: boolean }

/**
 * Checklist de primeros pasos para cuentas nuevas. El progreso es REAL (se
 * calcula de los datos: empleados, worksites, nóminas, invitaciones). Se puede
 * descartar (persistido) y lanzar el tour guiado.
 */
export function OnboardingChecklist({ steps }: { steps: ChecklistStep[] }) {
  const t = useTranslations()
  const [hidden, setHidden] = useState(false)
  const startTour = useTourStore((s) => s.start)

  const doneCount = steps.filter((s) => s.done).length
  const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0

  if (hidden) return null

  async function dismiss() {
    setHidden(true)
    await dismissOnboarding('checklist')
  }

  return (
    <Card className="border-primary/30 bg-primary/[0.03]" data-tour="checklist">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{t('onboarding.checklist.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('onboarding.checklist.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('onboarding.checklist.dismiss')}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Progress value={pct} className="h-2" />
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            {doneCount}/{steps.length}
          </span>
        </div>

        <ul className="divide-y rounded-md border bg-card">
          {steps.map((s) => (
            <li key={s.key}>
              <Link
                href={s.href}
                className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent"
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    s.done
                      ? 'border-success bg-success text-success-foreground'
                      : 'border-muted-foreground/40 text-transparent',
                  )}
                >
                  <Check className="h-3 w-3" />
                </span>
                <span className={cn('flex-1', s.done && 'text-muted-foreground line-through')}>
                  {t(`onboarding.checklist.steps.${s.key}` as 'onboarding.checklist.steps.addEmployee')}
                </span>
                {!s.done && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </Link>
            </li>
          ))}
        </ul>

        <Button variant="outline" size="sm" className="gap-2" onClick={() => startTour()}>
          <PlayCircle className="h-4 w-4" />
          {t('onboarding.checklist.takeTour')}
        </Button>
      </CardContent>
    </Card>
  )
}
