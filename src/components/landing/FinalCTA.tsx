import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function FinalCTA({ locale }: { locale: string }) {
  const t = await getTranslations()

  return (
    <section className="relative overflow-hidden bg-primary py-20 md:py-24">
      {/* Subtle pattern bg */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute right-0 top-0 h-96 w-96 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary-foreground blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary-foreground blur-3xl" />
      </div>

      <div className="container relative text-center">
        <h2 className="text-balance text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl">
          {t('landing.finalCta.title')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-balance text-lg text-primary-foreground/80">
          {t('landing.finalCta.sub')}
        </p>
        <div className="mt-10">
          <Link
            href={`/${locale}/signup`}
            className="inline-flex h-12 items-center justify-center rounded-md bg-background px-8 text-base font-semibold text-foreground transition-colors hover:bg-background/90"
          >
            {t('landing.finalCta.cta')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
