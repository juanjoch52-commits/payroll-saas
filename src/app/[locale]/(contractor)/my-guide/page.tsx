import { getTranslations } from 'next-intl/server'
import { requireContractor } from '@/lib/auth/contractor'
import { GuideSteps, stepsFromT } from '@/components/guide/GuideSteps'

/** Guía de inducción del contratista (versión de su portal). */
export default async function ContractorHelpPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  await requireContractor(locale)

  return (
    <div className="container max-w-md space-y-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">{t('guide.sections.contractor')}</h1>
        <p className="text-sm text-muted-foreground">{t('guide.contractor.intro')}</p>
      </header>
      <GuideSteps steps={stepsFromT((k) => t(k as 'guide.title'), 'guide.contractor', 5)} />
      <p className="text-center text-xs text-muted-foreground">{t('guide.askManager')}</p>
    </div>
  )
}
