import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { TipsPanel } from '@/components/admin/TipsPanel'

export default async function TipsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return <p className="p-6 text-destructive">{t('errors.unauthorized')}</p>
  }
  const supabase = createClient()

  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name')
    .eq('organization_id', session.organizationId)
    .eq('status', 'active')
    .order('first_name')

  const { data: tips } = await supabase
    .from('tip_entries')
    .select('id, work_date, amount_cents, source, status, employees(first_name, last_name)')
    .eq('organization_id', session.organizationId)
    .order('work_date', { ascending: false })
    .limit(80)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('tips.title')}</h1>
        <p className="text-muted-foreground">{t('tips.subtitle')}</p>
      </div>
      <TipsPanel employees={(employees ?? []) as never} tips={(tips ?? []) as never} />
    </div>
  )
}
