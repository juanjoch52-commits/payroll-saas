import { getTranslations } from 'next-intl/server'
import { Building2, HardHat, Network } from 'lucide-react'
import { requireSession } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/page-header'
import { GuideSteps, stepsFromT } from '@/components/guide/GuideSteps'

// =============================================================================
// Guía de inducción (vista de la empresa): los 3 perfiles en una página, con
// anclas — sirve para el propio manager y para explicarle el sistema a un
// trabajador o contratista recién llegado. Los portales de empleado y
// contratista tienen su propia versión reducida en /help.
// =============================================================================

const SECTIONS = [
  { id: 'company', icon: Building2, steps: 7 },
  { id: 'worker', icon: HardHat, steps: 7 },
  { id: 'contractor', icon: Network, steps: 5 },
] as const

export default async function GuidePage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  await requireSession(`/${locale}/login`)

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title={t('guide.title')} description={t('guide.sub')} />

      {/* Anclas rápidas */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(({ id, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Icon className="h-4 w-4" />
            {t(`guide.sections.${id}` as 'guide.sections.company')}
          </a>
        ))}
      </div>

      {SECTIONS.map(({ id, icon: Icon, steps }) => (
        <section key={id} id={id} className="scroll-mt-20 space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Icon className="h-5 w-5 text-primary" />
            {t(`guide.sections.${id}` as 'guide.sections.company')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(`guide.${id}.intro` as 'guide.company.intro')}
          </p>
          <GuideSteps steps={stepsFromT((k) => t(k as 'guide.title'), `guide.${id}`, steps)} />
        </section>
      ))}
    </div>
  )
}
