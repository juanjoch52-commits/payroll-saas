'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionReveal } from './SectionReveal'

type Plan = {
  key: 'essential' | 'advanced' | 'premium'
  monthly: number
  annual: number
  popular?: boolean
  cta: 'start' | 'sales'
}

const PLANS: Plan[] = [
  { key: 'essential', monthly: 49, annual: 490, cta: 'start' },
  { key: 'advanced', monthly: 99, annual: 990, popular: true, cta: 'start' },
  { key: 'premium', monthly: 199, annual: 1990, cta: 'sales' },
]

export function PricingTable({ locale }: { locale: string }) {
  const t = useTranslations('landing.pricing')
  const tPlans = useTranslations('billing.plans')
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="py-16 md:py-24">
      <div className="container">
        <SectionReveal className="mx-auto max-w-3xl space-y-3 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h2>
          <p className="text-balance text-lg text-muted-foreground">{t('sub')}</p>
        </SectionReveal>

        <SectionReveal
          index={1}
          className="mx-auto mt-8 flex w-fit items-center gap-1 rounded-full border bg-background p-1"
        >
          <button
            onClick={() => setAnnual(false)}
            className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !annual ? 'text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            {!annual && (
              <motion.span
                layoutId="pricing-toggle-pill"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative">{t('monthly')}</span>
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              annual ? 'text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            {annual && (
              <motion.span
                layoutId="pricing-toggle-pill"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {t('annual')}
              <span className="rounded-full bg-success/20 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                -17%
              </span>
            </span>
          </button>
        </SectionReveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((p, i) => {
            const price = annual ? p.annual : p.monthly
            const period = annual ? t('perYear') : t('perMonth')
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
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={`${p.key}-${annual}`}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.2 }}
                          className="text-4xl font-bold tabular-nums"
                        >
                          ${price}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-sm font-normal text-muted-foreground">{period}</span>
                    </CardTitle>
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
