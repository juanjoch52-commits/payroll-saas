import { ChevronDown } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

const items = ['card', 'noEmail', 'states', 'filing', 'secure', 'cancel'] as const

export async function FAQ() {
  const t = await getTranslations()

  return (
    <section id="faq" className="container py-20 md:py-28">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            {t('landing.faq.title')}
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {items.map((key) => (
            <details
              key={key}
              className="group rounded-xl border bg-card p-5 transition-colors hover:bg-accent/30"
            >
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold marker:hidden">
                {t(`landing.faq.items.${key}.q` as 'landing.faq.items.card.q')}
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">
                {t(`landing.faq.items.${key}.a` as 'landing.faq.items.card.a')}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
