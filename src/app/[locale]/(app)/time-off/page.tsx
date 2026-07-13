import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { TimeOffManager } from '@/components/admin/TimeOffManager'

export default async function TimeOffPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return <p className="p-6 text-destructive">{t('errors.unauthorized')}</p>
  }
  const supabase = createClient()

  const { data: policies } = await supabase
    .from('pto_policies')
    .select('id, name, pto_type, paid, accrual_method, accrual_rate, max_balance_hours')
    .eq('organization_id', session.organizationId)
    .eq('is_active', true)
    .order('name')

  const { data: requests } = await supabase
    .from('time_off_requests')
    .select(
      'id, start_date, end_date, hours, reason, status, employees(first_name, last_name), pto_policies(name)',
    )
    .eq('organization_id', session.organizationId)
    .order('created_at', { ascending: false })
    .limit(60)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('timeOff.title')}</h1>
        <p className="text-muted-foreground">{t('timeOff.subtitle')}</p>
      </div>
      <TimeOffManager
        role={session.role}
        policies={(policies ?? []) as never}
        requests={(requests ?? []) as never}
      />
    </div>
  )
}
