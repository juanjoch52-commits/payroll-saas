'use client'

import { motion } from 'framer-motion'
import { Send, Camera, Calculator } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { SectionReveal } from './SectionReveal'

const STEPS = [
  { key: 'invite', icon: Send, number: '01' },
  { key: 'clock', icon: Camera, number: '02' },
  { key: 'pay', icon: Calculator, number: '03' },
]

export function HowItWorks() {
  const t = useTranslations('landing.howItWorks')

  return (
    <section id="how-it-works" className="border-y bg-muted/30 py-16 md:py-24">
      <div className="container">
        <SectionReveal className="mx-auto max-w-3xl space-y-3 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h2>
          <p className="text-balance text-lg text-muted-foreground">{t('sub')}</p>
        </SectionReveal>

        <div className="relative mt-16">
          {/* Connector line (desktop) */}
          <div className="absolute left-1/2 top-12 hidden h-[2px] w-full max-w-3xl -translate-x-1/2 overflow-hidden bg-border md:block">
            <motion.div
              className="h-full bg-gradient-to-r from-primary via-primary to-primary"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              transition={{ duration: 1.4, ease: 'easeInOut' }}
              viewport={{ once: true }}
              style={{ transformOrigin: 'left' }}
            />
          </div>

          <div className="grid gap-12 md:grid-cols-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.25, duration: 0.6 }}
                  className="relative text-center"
                >
                  <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-primary/10" />
                    <span className="absolute inset-1 rounded-full border-2 border-primary bg-background" />
                    <Icon className="relative h-10 w-10 text-primary" />
                  </div>

                  <p className="mb-2 text-xs font-bold tabular-nums tracking-widest text-primary">
                    {s.number}
                  </p>
                  <h3 className="text-lg font-semibold">{t(`steps.${s.key}.title`)}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                    {t(`steps.${s.key}.desc`)}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
