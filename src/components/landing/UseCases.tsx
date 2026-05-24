'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
  HardHat,
  UtensilsCrossed,
  Wrench,
  PaintBucket,
  Sparkles,
  Leaf,
  Check,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { SectionReveal } from './SectionReveal'
import { cn } from '@/lib/utils'

const INDUSTRIES = [
  { id: 'construction', icon: HardHat },
  { id: 'restaurants', icon: UtensilsCrossed },
  { id: 'trades', icon: Wrench },
  { id: 'painting', icon: PaintBucket },
  { id: 'cleaning', icon: Sparkles },
  { id: 'landscaping', icon: Leaf },
] as const

type Industry = (typeof INDUSTRIES)[number]['id']

export function UseCases() {
  const t = useTranslations('landing.useCases')
  const [active, setActive] = useState<Industry>('construction')

  return (
    <section id="industries" className="py-16 md:py-24">
      <div className="container">
        <SectionReveal className="mx-auto max-w-3xl space-y-3 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h2>
          <p className="text-balance text-lg text-muted-foreground">{t('sub')}</p>
        </SectionReveal>

        {/* Tabs */}
        <SectionReveal index={1} className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-2">
          {INDUSTRIES.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={cn(
                'group flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all',
                active === id
                  ? 'border-primary bg-primary text-primary-foreground shadow-md'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {t(`industries.${id}.label`)}
            </button>
          ))}
        </SectionReveal>

        {/* Active content */}
        <div className="mx-auto mt-10 max-w-5xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden border-2 shadow-lg">
                <CardContent className="grid gap-0 p-0 md:grid-cols-2">
                  <div className="space-y-4 p-8">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {(() => {
                        const Icon = INDUSTRIES.find((i) => i.id === active)!.icon
                        return <Icon className="h-6 w-6" />
                      })()}
                    </div>
                    <h3 className="text-2xl font-bold">
                      {t(`industries.${active}.headline`)}
                    </h3>
                    <p className="text-muted-foreground">
                      {t(`industries.${active}.story`)}
                    </p>
                  </div>

                  <div className="space-y-3 border-t bg-muted/30 p-8 md:border-l md:border-t-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('benefitsLabel')}
                    </p>
                    <ul className="space-y-3">
                      {([0, 1, 2, 3] as const).map((i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          <span>{t(`industries.${active}.benefits.${i}`)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
