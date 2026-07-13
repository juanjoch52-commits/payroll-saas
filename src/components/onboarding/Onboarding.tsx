'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dismissOnboarding } from '@/app/actions/onboarding'
import { useTourStore } from './tourStore'
import { ProductTour } from './ProductTour'

/**
 * Orquesta el onboarding del dashboard: un diálogo de bienvenida para cuentas
 * nuevas + el tour guiado. Se monta en el dashboard (donde viven los objetivos
 * [data-tour]). El "dismiss" se persiste por organización.
 */
export function Onboarding({ tourDismissed }: { tourDismissed: boolean }) {
  const t = useTranslations()
  const [showWelcome, setShowWelcome] = useState(!tourDismissed)
  const { start, stop } = useTourStore()

  function startTour() {
    setShowWelcome(false)
    start()
  }
  async function skip() {
    setShowWelcome(false)
    await dismissOnboarding('tour')
  }
  async function finishTour() {
    stop()
    await dismissOnboarding('tour')
  }

  return (
    <>
      {showWelcome && (
        <div className="fixed inset-0 z-[1090] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={skip} />
          <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Rocket className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">{t('onboarding.welcome.title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.welcome.body')}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={skip}>
                {t('onboarding.welcome.skip')}
              </Button>
              <Button onClick={startTour}>{t('onboarding.welcome.start')}</Button>
            </div>
          </div>
        </div>
      )}
      <ProductTour onFinish={finishTour} />
    </>
  )
}
