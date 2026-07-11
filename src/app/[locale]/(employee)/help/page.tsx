import { getTranslations } from 'next-intl/server'
import { requireSession } from '@/lib/auth/session'
import { GuideSteps, stepsFromT } from '@/components/guide/GuideSteps'

/** Guía de inducción del trabajador (versión del portal del empleado). */
export default async function EmployeeHelpPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  await requireSession(`/${locale}/login`)

  return (
    <div className="container max-w-md space-y-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">{t('guide.sections.worker')}</h1>
        <p className="text-sm text-muted-foreground">{t('guide.worker.intro')}</p>
      </header>
      <GuideSteps steps={stepsFromT((k) => t(k as 'guide.title'), 'guide.worker', 7)} />
      <p className="text-center text-xs text-muted-foreground">{t('guide.askManager')}</p>
    </div>
  )
}
