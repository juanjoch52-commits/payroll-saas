'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Play, Shield, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { HeroMockup } from './HeroMockup'
import { AnimatedCounter } from './AnimatedCounter'

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

export function Hero({ locale }: { locale: string }) {
  const t = useTranslations()

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient mesh */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-0 top-40 h-[400px] w-[600px] rounded-full bg-info/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="container grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2 lg:gap-16 lg:py-32"
      >
        {/* Left column */}
        <div className="space-y-6">
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
          >
            <Sparkles className="h-3 w-3" />
            {t('landing.hero.badge')}
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-balance bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl lg:text-6xl"
          >
            {t('landing.hero.headline')}
          </motion.h1>

          {/* Subhead */}
          <motion.p
            variants={itemVariants}
            className="max-w-xl text-balance text-lg text-muted-foreground md:text-xl"
          >
            {t('landing.hero.sub')}
          </motion.p>

          {/* CTAs */}
          <motion.div variants={itemVariants} className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 gap-2 px-6 text-base shadow-lg shadow-primary/20">
              <Link href={`/${locale}/signup`}>
                {t('landing.hero.primaryCta')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 gap-2 px-6 text-base">
              <a href="#how-it-works">
                <Play className="h-4 w-4 fill-current" />
                {t('landing.hero.secondaryCta')}
              </a>
            </Button>
          </motion.div>

          {/* Microcopy */}
          <motion.p variants={itemVariants} className="text-sm text-muted-foreground">
            {t('landing.hero.microcopy')}
          </motion.p>

          {/* Trust line */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>{t('landing.hero.trustSecurity')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span>{t('landing.hero.trustSpeed')}</span>
            </div>
          </motion.div>

          {/* Inline stats */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-3 gap-6 border-t border-border/50 pt-6"
          >
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground md:text-3xl">
                <AnimatedCounter value={4} suffix="h+" />
              </p>
              <p className="text-xs text-muted-foreground">{t('landing.hero.stats.savedPerEmp')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground md:text-3xl">
                <AnimatedCounter value={97} suffix="%" />
              </p>
              <p className="text-xs text-muted-foreground">{t('landing.hero.stats.fewer')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground md:text-3xl">
                30<span className="text-base">d</span>
              </p>
              <p className="text-xs text-muted-foreground">{t('landing.hero.stats.trial')}</p>
            </div>
          </motion.div>
        </div>

        {/* Right column: mockup */}
        <motion.div
          variants={itemVariants}
          className="relative"
        >
          <HeroMockup
            workerName={t('landing.hero.mockupWorkerName')}
            clockedSince={t('landing.hero.mockupClockedSince')}
            jobsiteLabel={t('landing.hero.mockupJobsite')}
          />
        </motion.div>
      </motion.div>
    </section>
  )
}
