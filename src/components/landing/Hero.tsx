import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { HeroMockup } from './HeroMockup'

export async function Hero({ locale }: { locale: string }) {
  const t = await getTranslations()

  return (
    <section className="relative overflow-hidden">
      {/* Radial gradient sutil de fondo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="container grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2 lg:gap-16 lg:py-32">
        {/* Columna izquierda: texto + CTAs */}
        <div className="space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            {t('landing.hero.badge')}
          </div>

          {/* Headline */}
          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            {t('landing.hero.headline')}
          </h1>

          {/* Subhead */}
          <p className="max-w-xl text-balance text-lg text-muted-foreground md:text-xl">
            {t('landing.hero.sub')}
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link href={`/${locale}/signup`}>
                {t('landing.hero.primaryCta')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
              <Link href="#features">{t('landing.hero.secondaryCta')}</Link>
            </Button>
          </div>

          {/* Microcopy */}
          <p className="text-sm text-muted-foreground">{t('landing.hero.microcopy')}</p>
        </div>

        {/* Columna derecha: mockup */}
        <div className="relative">
          <HeroMockup
            workerName={t('landing.hero.mockupWorkerName')}
            clockedSince={t('landing.hero.mockupClockedSince')}
            jobsiteLabel={t('landing.hero.mockupJobsite')}
          />
        </div>
      </div>
    </section>
  )
}
