import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { DeductionsManager } from '@/components/admin/DeductionsManager'

export default async function DeductionsPage({ params: { locale } }: { params: { locale: string } }) {
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
    .limit(1000)

  const { data: deductions } = await supabase
    .from('employee_deductions')
    .select('id, employee_id, label, code, amount_cents, pre_tax')
    .eq('organization_id', session.organizationId)
    .eq('is_active', true)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('deductions.title')}</h1>
        <p className="text-muted-foreground">{t('deductions.subtitle')}</p>
      </div>
      <DeductionsManager
        employees={(employees ?? []) as never}
        deductions={(deductions ?? []) as never}
      />
    </div>
  )
}
