import { HardHat, Utensils, Wrench, PaintBucket } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function TrustBar() {
  const t = await getTranslations()

  const industries = [
    { icon: HardHat, key: 'construction' },
    { icon: Utensils, key: 'restaurants' },
    { icon: Wrench, key: 'trades' },
    { icon: PaintBucket, key: 'painting' },
  ] as const

  return (
    <section className="border-y bg-muted/30 py-12">
      <div className="container">
        <p className="text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t('landing.trust.title')}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
          {industries.map(({ icon: Icon, key }) => (
            <div key={key} className="flex flex-col items-center gap-2 text-muted-foreground">
              <Icon className="h-8 w-8" />
              <span className="text-sm font-medium">
                {t(`landing.trust.industries.${key}` as 'landing.trust.industries.construction')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
