import Link from 'next/link'
import { Check } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const tiers = [
  { key: 'essential', price: 49, popular: false, cta: 'ctaStart' },
  { key: 'advanced', price: 99, popular: true, cta: 'ctaStart' },
  { key: 'premium', price: 199, popular: false, cta: 'ctaSales' },
] as const

export async function PricingTable({ locale }: { locale: string }) {
  const t = await getTranslations()

  return (
    <section id="pricing" className="bg-muted/30 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            {t('landing.pricing.title')}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t('landing.pricing.sub')}</p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-3">
          {tiers.map(({ key, price, popular, cta }) => {
            const features = t.raw(
              `billing.plans.${key}.features` as 'billing.plans.essential.features',
            ) as string[]
            const ctaHref =
              cta === 'ctaSales' ? 'mailto:hello@myjova.com' : `/${locale}/signup`

            return (
              <div
                key={key}
                className={cn(
                  'relative rounded-2xl border bg-card p-8 shadow-sm',
                  popular && 'border-primary shadow-lg ring-2 ring-primary/30',
                )}
              >
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {t('landing.pricing.mostPopular')}
                  </span>
                )}

                <h3 className="text-lg font-semibold">
                  {t(`billing.plans.${key}.name` as 'billing.plans.essential.name')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(`billing.plans.${key}.tagline` as 'billing.plans.essential.tagline')}
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${price}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>

                <Button asChild className="mt-6 w-full" variant={popular ? 'default' : 'outline'}>
                  <Link href={ctaHref}>
                    {t(`landing.pricing.${cta}` as 'landing.pricing.ctaStart')}
                  </Link>
                </Button>

                <ul className="mt-8 space-y-3">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          {t('landing.pricing.footer')}
        </p>
      </div>
    </section>
  )
}
