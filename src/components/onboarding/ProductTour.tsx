'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useTourStore } from './tourStore'

// =============================================================================
// Tour guiado tipo "spotlight": oscurece la pantalla y resalta el elemento
// objetivo (por [data-tour]) con un tooltip explicativo. Sin dependencias de
// librerías de tour — usa la técnica del box-shadow gigante para el foco.
// =============================================================================

type Step = { selector?: string; title: string; body: string }

const PAD = 8
const CARD_W = 320

export function ProductTour({ onFinish }: { onFinish: () => void }) {
  const t = useTranslations()
  const { isOpen, index, next, prev } = useTourStore()
  const [rect, setRect] = useState<DOMRect | null>(null)

  const steps: Step[] = useMemo(
    () => [
      {
        selector: '[data-tour="quick-actions"]',
        title: t('onboarding.tour.actions.title'),
        body: t('onboarding.tour.actions.body'),
      },
      {
        selector: '[data-tour="kpis"]',
        title: t('onboarding.tour.kpis.title'),
        body: t('onboarding.tour.kpis.body'),
      },
      {
        selector: '[data-tour="live-activity"]',
        title: t('onboarding.tour.activity.title'),
        body: t('onboarding.tour.activity.body'),
      },
      {
        selector: '[data-tour="sidebar"]',
        title: t('onboarding.tour.nav.title'),
        body: t('onboarding.tour.nav.body'),
      },
    ],
    [t],
  )

  const isLast = index >= steps.length - 1
  const step = steps[index]

  // Mide el objetivo del paso actual y re-mide en resize/scroll.
  useEffect(() => {
    if (!isOpen || !step) return
    const el = step.selector ? (document.querySelector(step.selector) as HTMLElement | null) : null
    const update = () => {
      if (!el) return setRect(null)
      const r = el.getBoundingClientRect()
      // Elemento oculto (p.ej. sidebar en móvil) → sin foco, tooltip centrado.
      setRect(r.width === 0 && r.height === 0 ? null : r)
    }
    if (el) el.scrollIntoView({ block: 'center', inline: 'nearest' })
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [isOpen, index, step])

  if (!isOpen || !step) return null

  // Posición del tooltip: debajo del objetivo si cabe, si no encima; centrado
  // cuando no hay objetivo medible.
  let cardStyle: React.CSSProperties
  if (rect) {
    const below = rect.bottom + 12 + 180 < window.innerHeight
    const left = Math.min(Math.max(rect.left, 12), window.innerWidth - CARD_W - 12)
    cardStyle = below
      ? { position: 'fixed', top: rect.bottom + 12, left, width: CARD_W }
      : { position: 'fixed', bottom: window.innerHeight - rect.top + 12, left, width: CARD_W }
  } else {
    cardStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      width: CARD_W,
      transform: 'translate(-50%, -50%)',
    }
  }

  return (
    <div className="fixed inset-0 z-[1100]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Capa que captura clics (no deja interactuar con la página) */}
      <div className="absolute inset-0" />

      {/* Foco: caja con box-shadow gigante que oscurece el resto */}
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-primary transition-all duration-300"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.65)',
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-foreground/60" />
      )}

      {/* Tooltip */}
      <div
        style={cardStyle}
        className="max-w-[90vw] rounded-lg border bg-card p-4 shadow-2xl"
      >
        <p className="text-sm font-semibold">{step.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {index + 1} / {steps.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onFinish}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t('onboarding.tour.skip')}
            </button>
            {index > 0 && (
              <Button type="button" size="sm" variant="outline" onClick={prev}>
                {t('onboarding.tour.back')}
              </Button>
            )}
            <Button type="button" size="sm" onClick={isLast ? onFinish : next}>
              {isLast ? t('onboarding.tour.done') : t('onboarding.tour.next')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
