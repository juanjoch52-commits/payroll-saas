import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { EmployeeSchedule } from '@/components/employee/EmployeeSchedule'

export default async function EmployeeSchedulePage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()

  const now = new Date().toISOString()

  const { data: mine } = emp
    ? await supabase
        .from('shifts')
        .select('id, starts_at, ends_at, role_label, status, worksites(name)')
        .eq('employee_id', (emp as { id: string }).id)
        .eq('status', 'published')
        .gte('ends_at', now)
        .order('starts_at')
        .limit(40)
    : { data: [] }

  const { data: open } = await supabase
    .from('shifts')
    .select('id, starts_at, ends_at, role_label, worksites(name)')
    .eq('organization_id', session.organizationId)
    .eq('status', 'open')
    .gte('ends_at', now)
    .order('starts_at')
    .limit(30)

  return (
    <div className="container max-w-md py-6">
      <h1 className="mb-4 text-2xl font-bold">{t('schedule.myTitle')}</h1>
      <EmployeeSchedule locale={locale} mine={(mine ?? []) as never} open={(open ?? []) as never} />
    </div>
  )
}
