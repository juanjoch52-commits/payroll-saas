import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { ScheduleBoard } from '@/components/admin/ScheduleBoard'

function mondayOf(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = x.getUTCDay()
  const diff = (day === 0 ? -6 : 1) - day
  x.setUTCDate(x.getUTCDate() + diff)
  return x
}

export default async function SchedulePage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { week?: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return <p className="p-6 text-destructive">{t('errors.unauthorized')}</p>
  }

  const weekStart = searchParams.week ? new Date(searchParams.week) : mondayOf(new Date())
  const weekStartISO = weekStart.toISOString().slice(0, 10)
  const end = new Date(weekStart.getTime() + 7 * 86400000)
  const supabase = createClient()

  const { data: shifts } = await supabase
    .from('shifts')
    .select(
      'id, employee_id, worksite_id, starts_at, ends_at, role_label, break_minutes, status, employees(first_name, last_name), worksites(name)',
    )
    .eq('organization_id', session.organizationId)
    .gte('starts_at', weekStart.toISOString())
    .lt('starts_at', end.toISOString())
    .order('starts_at')

  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name')
    .eq('organization_id', session.organizationId)
    .eq('status', 'active')
    .order('first_name')
    .limit(1000)

  const { data: worksites } = await supabase
    .from('worksites')
    .select('id, name')
    .eq('organization_id', session.organizationId)
    .eq('is_active', true)
    .order('name')
    .limit(500)

  // Mapa de tarifa por hora (centavos) para proyección de costo laboral.
  const { data: schemes } = await supabase
    .from('pay_schemes')
    .select('employee_id, scheme_type, config')
    .eq('organization_id', session.organizationId)
    .eq('scheme_type', 'hourly')
    .is('effective_to', null)
  const rateByEmployee: Record<string, number> = {}
  for (const s of (schemes ?? []) as { employee_id: string; config: { rateCents?: number } }[]) {
    if (s.config?.rateCents) rateByEmployee[s.employee_id] = s.config.rateCents
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('schedule.title')}</h1>
        <p className="text-muted-foreground">{t('schedule.subtitle')}</p>
      </div>
      <ScheduleBoard
        locale={locale}
        weekStartISO={weekStartISO}
        shifts={(shifts ?? []) as never}
        employees={(employees ?? []) as never}
        worksites={(worksites ?? []) as never}
        rateByEmployee={rateByEmployee}
      />
    </div>
  )
}
