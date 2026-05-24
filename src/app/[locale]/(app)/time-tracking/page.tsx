import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { TimeTrackingPanel } from '@/components/admin/TimeTrackingPanel'

export default async function TimeTrackingPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { status?: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)

  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return <p className="p-6 text-destructive">{t('errors.unauthorized')}</p>
  }

  const statusFilter = (searchParams.status as 'pending' | 'approved' | 'rejected' | undefined) ?? 'pending'
  const supabase = createClient()

  let query = supabase
    .from('time_entries')
    .select(
      'id, clock_in_at, clock_out_at, billable_minutes, status, clock_in_outside_geofence, clock_in_lat, clock_in_lng, employees!inner(id, first_name, last_name), worksites(name)',
    )
    .eq('organization_id', session.organizationId)
    .order('clock_in_at', { ascending: false })
    .limit(200)

  if (statusFilter && statusFilter !== 'all' as never) {
    query = query.eq('status', statusFilter)
  }

  const { data: entries } = await query

  const { data: worksites } = await supabase
    .from('worksites')
    .select('id, name, latitude, longitude, radius_m')
    .eq('organization_id', session.organizationId)
    .eq('is_active', true)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('timeTracking.title')}</h1>

      <TimeTrackingPanel
        locale={locale}
        entries={(entries ?? []) as never}
        worksites={(worksites ?? []) as never}
        currentStatus={statusFilter}
      />
    </div>
  )
}
