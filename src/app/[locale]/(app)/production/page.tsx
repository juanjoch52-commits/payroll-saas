import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { ProductionPanel } from '@/components/admin/ProductionPanel'

/**
 * Producción a destajo — registro y aprobación por manager.
 * Las entries aprobadas se agregan a la nómina para empleados con scheme
 * 'piecerate' (ver calculateRunItems en src/app/actions/payroll.ts).
 */
export default async function ProductionPage({
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

  // Empleados con scheme piece-rate activo (para el select + prefijar rate/unidad).
  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, pay_schemes!inner(scheme_type, config, effective_to)')
    .eq('organization_id', session.organizationId)
    .eq('status', 'active')
    .eq('pay_schemes.scheme_type', 'piecerate')
    .is('pay_schemes.effective_to', null)
    .order('first_name')

  // Entries recientes (todas las del org, ordenadas por fecha).
  const { data: entries } = await supabase
    .from('production_entries')
    .select(
      'id, work_date, unit_code, unit_label, quantity, rate_per_unit_cents, status, payroll_item_id, employees!inner(first_name, last_name)',
    )
    .eq('organization_id', session.organizationId)
    .order('work_date', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('production.title')}</h1>
        <p className="text-muted-foreground">{t('production.subtitle')}</p>
      </div>

      <ProductionPanel
        locale={locale}
        employees={(employees ?? []) as never}
        entries={(entries ?? []) as never}
      />
    </div>
  )
}
