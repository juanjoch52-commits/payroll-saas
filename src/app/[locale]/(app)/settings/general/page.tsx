import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { IndustrySelector } from '@/components/settings/IndustrySelector'
import { TimezoneSelector } from '@/components/settings/TimezoneSelector'
import { BreakPolicyCard } from '@/components/settings/BreakPolicyCard'
import { SubcontractorsToggleCard } from '@/components/settings/SubcontractorsToggleCard'
import { DataExportCard } from '@/components/settings/DataExportCard'
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
    .select(
      'industry_type, timezone, break_auto_deduct_minutes, break_auto_deduct_threshold_minutes, standard_shift_minutes, uses_subcontractors',
    )
    .eq('id', session.organizationId)
    .single()

  const industry = ((org?.industry_type as IndustryType) ?? 'general') as IndustryType
  const orgRow = org as {
    timezone?: string
    break_auto_deduct_minutes?: number
    break_auto_deduct_threshold_minutes?: number
    standard_shift_minutes?: number
    uses_subcontractors?: boolean
  } | null
  const timezone = (orgRow?.timezone ?? 'America/New_York') as string
  const breakMinutes = orgRow?.break_auto_deduct_minutes ?? 0
  const breakThreshold = orgRow?.break_auto_deduct_threshold_minutes ?? 360
  const shiftMinutes = orgRow?.standard_shift_minutes ?? 480
  const usesSubcontractors = orgRow?.uses_subcontractors ?? false

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.general.title')}</h1>
        <p className="text-muted-foreground">{t('settings.general.subtitle')}</p>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <IndustrySelector locale={locale} current={industry} />
      </div>
      <div className="rounded-lg border bg-card p-6">
        <TimezoneSelector current={timezone} />
      </div>
      <div className="rounded-lg border bg-card p-6">
        <BreakPolicyCard
          currentMinutes={breakMinutes}
          currentThresholdMinutes={breakThreshold}
          currentShiftMinutes={shiftMinutes}
        />
      </div>
      <div className="rounded-lg border bg-card p-6">
        <SubcontractorsToggleCard current={usesSubcontractors} />
      </div>
      <div className="rounded-lg border bg-card p-6">
        <DataExportCard />
      </div>
    </div>
  )
}
