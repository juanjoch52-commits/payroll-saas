'use client'

import { useTranslations } from 'next-intl'

import { SectionReveal } from './SectionReveal'

/**
 * Marquee infinito de logos de integraciones futuras.
 * Las marcas son referencias representativas de los integraciones planificadas
 * para 2026 según el roadmap (QuickBooks, Toast, Square, Xero, Stripe, Slack,
 * Gusto, ADP). Las APIs reales se conectarán en fases posteriores.
 */
export function IntegrationsLogos() {
  const t = useTranslations('landing.integrations')

  const logos = [
    'QuickBooks',
    'Stripe',
    'Slack',
    'Gusto',
    'Toast',
    'Square',
    'ADP',
    'Xero',
    'Zapier',
    'Notion',
  ]
  // Duplicamos para que el loop sea continuo sin saltos.
  const doubled = [...logos, ...logos]

  return (
    <section className="border-y bg-background py-12">
      <div className="container">
        <SectionReveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('title')}
          </p>
        </SectionReveal>

        <div className="group relative mt-8 overflow-hidden">
          {/* Edges fade */}
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-background to-transparent" />

          <div className="flex w-max animate-marquee gap-12 group-hover:[animation-play-state:paused]">
            {doubled.map((logo, i) => (
              <div
                key={`${logo}-${i}`}
                className="flex h-12 min-w-[140px] items-center justify-center rounded-lg border bg-muted/30 px-6 text-base font-semibold tracking-tight text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                {logo}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">{t('footer')}</p>
      </div>
    </section>
  )
}
