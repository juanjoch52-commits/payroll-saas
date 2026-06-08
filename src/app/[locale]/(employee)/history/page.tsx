import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

export default async function HistoryPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  // Encontrar employee row
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()

  const { data: entries } = employee
    ? await supabase
        .from('time_entries')
        .select('id, clock_in_at, clock_out_at, billable_minutes, status, clock_in_outside_geofence')
        .eq('employee_id', employee.id)
        .order('clock_in_at', { ascending: false })
        .limit(30)
    : { data: [] }

  return (
    <div className="container max-w-md space-y-3 py-6">
      <h1 className="text-2xl font-bold">{t('nav.history')}</h1>

      {(entries ?? []).map((e) => {
        const minutes = e.billable_minutes ?? 0
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return (
          <Card key={e.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{formatDate(e.clock_in_at, locale)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.clock_in_at).toLocaleTimeString()} →{' '}
                  {e.clock_out_at ? new Date(e.clock_out_at).toLocaleTimeString() : 'open'}
                </p>
                {e.clock_in_outside_geofence && (
                  <p className="mt-1 text-xs font-medium text-warning-foreground">{t('timeTracking.flagged')}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {h}h {m}m
                </p>
                <p
                  className={
                    e.status === 'approved'
                      ? 'text-xs font-medium text-success-foreground'
                      : e.status === 'rejected'
                        ? 'text-xs text-destructive'
                        : 'text-xs text-muted-foreground'
                  }
                >
                  {t(`timeTracking.${e.status as 'pending'}` as 'timeTracking.pending')}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {(!entries || entries.length === 0) && (
        <p className="py-12 text-center text-muted-foreground">{t('timeTracking.noEntries')}</p>
      )}
    </div>
  )
}
