import {
  Camera,
  Calculator,
  FileText,
  LayoutDashboard,
  Smartphone,
  Shield,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

const features = [
  { key: 'clockIn', icon: Camera },
  { key: 'paySchemes', icon: Calculator },
  { key: 'taxForms', icon: FileText },
  { key: 'dashboard', icon: LayoutDashboard },
  { key: 'mobile', icon: Smartphone },
  { key: 'secure', icon: Shield },
] as const

export async function Features() {
  const t = await getTranslations()

  return (
    <section id="features" className="container py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
          {t('landing.features.title')}
        </h2>
        <p className="mt-4 text-balance text-lg text-muted-foreground">
          {t('landing.features.sub')}
        </p>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map(({ key, icon: Icon }) => (
          <div
            key={key}
            className="group relative rounded-xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">
              {t(`landing.features.items.${key}.title` as 'landing.features.items.clockIn.title')}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(`landing.features.items.${key}.desc` as 'landing.features.items.clockIn.desc')}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
