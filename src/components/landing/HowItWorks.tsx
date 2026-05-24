import { Send, Camera, Calculator } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

const steps = [
  { key: 'invite', icon: Send },
  { key: 'clock', icon: Camera },
  { key: 'pay', icon: Calculator },
] as const

export async function HowItWorks() {
  const t = await getTranslations()

  return (
    <section className="bg-muted/30 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            {t('landing.howItWorks.title')}
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map(({ key, icon: Icon }, idx) => (
            <div key={key} className="relative">
              {/* Connector line entre pasos (solo desktop) */}
              {idx < steps.length - 1 && (
                <div className="absolute left-[calc(50%+2rem)] right-0 top-8 hidden h-px bg-border md:block" />
              )}

              <div className="relative flex flex-col items-center text-center">
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                  <Icon className="h-7 w-7" />
                </div>
                <span className="mt-2 text-xs font-bold uppercase tracking-wider text-primary">
                  Step {idx + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold">
                  {t(`landing.howItWorks.steps.${key}.title` as 'landing.howItWorks.steps.invite.title')}
                </h3>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  {t(`landing.howItWorks.steps.${key}.desc` as 'landing.howItWorks.steps.invite.desc')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
