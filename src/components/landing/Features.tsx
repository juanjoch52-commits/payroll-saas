'use client'

import { motion } from 'framer-motion'
import {
  Camera,
  Calculator,
  FileText,
  LayoutDashboard,
  Smartphone,
  Shield,
  Network,
  CalendarCheck2,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Card, CardContent } from '@/components/ui/card'
import { SectionReveal } from './SectionReveal'

const FEATURES: { key: string; icon: LucideIcon; accent: string }[] = [
  { key: 'clockIn', icon: Camera, accent: 'from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400' },
  { key: 'weeklyClose', icon: CalendarCheck2, accent: 'from-sky-500/20 to-sky-500/5 text-sky-600 dark:text-sky-400' },
  { key: 'contractors', icon: Network, accent: 'from-orange-500/20 to-orange-500/5 text-orange-600 dark:text-orange-400' },
  { key: 'paySchemes', icon: Calculator, accent: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400' },
  { key: 'breaks', icon: Utensils, accent: 'from-lime-500/20 to-lime-500/5 text-lime-600 dark:text-lime-400' },
  { key: 'taxForms', icon: FileText, accent: 'from-purple-500/20 to-purple-500/5 text-purple-600 dark:text-purple-400' },
  { key: 'dashboard', icon: LayoutDashboard, accent: 'from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400' },
  { key: 'mobile', icon: Smartphone, accent: 'from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-400' },
  { key: 'secure', icon: Shield, accent: 'from-teal-500/20 to-teal-500/5 text-teal-600 dark:text-teal-400' },
]

export function Features() {
  const t = useTranslations('landing.features')

  return (
    <section id="features" className="py-16 md:py-24">
      <div className="container">
        <SectionReveal className="mx-auto max-w-3xl space-y-3 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h2>
          <p className="text-balance text-lg text-muted-foreground">{t('sub')}</p>
        </SectionReveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card className="group h-full overflow-hidden border-border/50 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
                  <CardContent className="p-6">
                    <div
                      className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} transition-transform group-hover:scale-110`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">
                      {t(`items.${f.key}.title`)}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t(`items.${f.key}.desc`)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
