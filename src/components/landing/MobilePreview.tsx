import { Check, Clock, History, Receipt, MapPin } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

const bullets = [
  { key: 'clock', icon: Clock },
  { key: 'history', icon: History },
  { key: 'paystubs', icon: Receipt },
  { key: 'geofence', icon: MapPin },
] as const

export async function MobilePreview() {
  const t = await getTranslations()

  return (
    <section className="container py-20 md:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Texto + bullets */}
        <div>
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            {t('landing.mobile.title')}
          </h2>
          <p className="mt-4 text-balance text-lg text-muted-foreground">
            {t('landing.mobile.sub')}
          </p>

          <ul className="mt-8 space-y-4">
            {bullets.map(({ key, icon: Icon }) => (
              <li key={key} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-4 w-4" />
                </div>
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm">
                    {t(`landing.mobile.bullets.${key}` as 'landing.mobile.bullets.clock')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Phone mockup decorativo */}
        <div className="relative mx-auto w-[280px]">
          <div className="overflow-hidden rounded-[2.5rem] border-[10px] border-foreground/90 bg-background shadow-2xl">
            <div className="bg-foreground/95 py-2 text-center">
              <div className="mx-auto h-1 w-12 rounded-full bg-background/30" />
            </div>
            <div className="space-y-3 p-5 pb-8">
              {/* Mini items que simulan el portal */}
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs font-medium">Today's shift</p>
                <p className="mt-1 text-2xl font-bold">8h 14m</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs font-medium">Last pay stub</p>
                <p className="mt-1 text-2xl font-bold">$1,247.50</p>
                <p className="text-xs text-muted-foreground">Mar 16 → Mar 29</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs font-medium">This week</p>
                <div className="mt-2 flex items-end gap-1">
                  {[40, 60, 80, 100, 70, 0, 0].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-primary/60"
                      style={{ height: `${h * 0.4}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
