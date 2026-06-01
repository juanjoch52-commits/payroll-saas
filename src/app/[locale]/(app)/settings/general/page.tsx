import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { IndustrySelector } from '@/components/settings/IndustrySelector'
import { type IndustryType } from '@/lib/industry/presets'

export default async function GeneralSettingsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)

  if (!['owner', 'admin'].includes(session.role)) {
    return <p className="p-6 text-destructive">{t('errors.unauthorized')}</p>
  }

  const supabase = createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('industry_type')
    .eq('id', session.organizationId)
    .single()

  const industry = ((org?.industry_type as IndustryType) ?? 'general') as IndustryType

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.general.title')}</h1>
        <p className="text-muted-foreground">{t('settings.general.subtitle')}</p>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <IndustrySelector locale={locale} current={industry} />
      </div>
    </div>
  )
}
