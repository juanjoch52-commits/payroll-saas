'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Sparkles, Globe } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionReveal } from './SectionReveal'
import { formatPrice, type Currency } from '@/lib/pricing/currency'

export type PricedPlan = {
  key: 'essential' | 'advanced' | 'premium'
  /** Base mensual pre-convertida a la moneda destino (unidades enteras). */
  base: number
  /** Precio por trabajador activo pre-convertido. */
  perWorker: number
  popular?: boolean
  cta: 'start' | 'sales'
}

export function PricingTableClient({
  locale,
  currency,
  bcp47,
  plans,
  countryHint,
}: {
  locale: string
  currency: Currency
  /** BCP 47 locale to use for Intl.NumberFormat. */
  bcp47: string
  plans: PricedPlan[]
  /** Detected country (e.g. 'CA', 'US') — shown as small badge for transparency. */
  countryHint: string | null
}) {
  const t = useTranslations('landing.pricing')
  const tPlans = useTranslations('billing.plans')

  return (
    <section id="pricing" className="py-16 md:py-24">
      <div className="container">
        <SectionReveal className="mx-auto max-w-3xl space-y-3 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h2>
          <p className="text-balance text-lg text-muted-foreground">{t('sub')}</p>

          {countryHint && (
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary">
              <Globe className="h-3 w-3" />
              {t('currencyHint', { currency, country: countryHint })}
            </p>
          )}
        </SectionReveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p, i) => {
            const features = tPlans.raw(`${p.key}.features`) as string[]

            return (
              <motion.div
                key={p.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Card
                  className={`relative h-full transition-all hover:shadow-xl ${
                    p.popular
                      ? 'border-2 border-primary shadow-xl shadow-primary/10 lg:scale-105'
                      : 'border-border/50'
                  }`}
                >
                  {p.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
                        <Sparkles className="h-3 w-3" />
                        {t('mostPopular')}
                      </span>
                    </div>
                  )}

                  <CardHeader className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {tPlans(`${p.key}.name`)}
                    </p>
                    <CardTitle className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-bold tabular-nums">
                        {formatPrice(p.base, currency, bcp47)}
                      </span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {t('perMonth')}
                      </span>
                    </CardTitle>
                    <p className="text-sm font-medium text-primary">
                      {t('plusPerWorker', { price: formatPrice(p.perWorker, currency, bcp47) })}
                    </p>
                    <p className="text-sm text-muted-foreground">{tPlans(`${p.key}.tagline`)}</p>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <Button
                      asChild
                      size="lg"
                      variant={p.popular ? 'default' : 'outline'}
                      className="w-full"
                    >
                      <Link
                        href={p.cta === 'sales' ? 'mailto:hello@myjova.com' : `/${locale}/signup`}
                      >
                        {p.cta === 'sales' ? t('ctaSales') : t('ctaStart')}
                      </Link>
                    </Button>

                    <ul className="space-y-3 pt-2">
                      {features.map((f) => (
                        <li key={f} className="flex gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">{t('footer')}</p>
      </div>
    </section>
  )
}
