'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'

export function FinalCTA({ locale }: { locale: string }) {
  const t = useTranslations('landing.finalCta')

  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="absolute inset-x-4 inset-y-0 -z-10 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-info">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2 }}
          viewport={{ once: true }}
          className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/15 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          viewport={{ once: true }}
          className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <div className="container py-16 text-center text-primary-foreground md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            {t('badge')}
          </div>

          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-5xl">
            {t('title')}
          </h2>

          <p className="text-balance text-lg opacity-90 md:text-xl">{t('sub')}</p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-12 gap-2 bg-white px-6 text-base text-primary shadow-xl hover:bg-white/90"
            >
              <Link href={`/${locale}/signup`}>
                {t('cta')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Link
              href={`/${locale}/preview/business`}
              className="text-sm font-medium underline-offset-4 opacity-90 hover:underline"
            >
              {t('demo')}
            </Link>
          </div>

          <p className="text-xs opacity-80">{t('microcopy')}</p>
        </motion.div>
      </div>
    </section>
  )
}
