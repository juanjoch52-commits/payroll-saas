import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { PayrollRunDetail } from '@/components/payroll/PayrollRunDetail'

export default async function PayrollRunPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  const { data: run } = await supabase
    .from('payroll_runs')
    .select('id, name, status, period_start, period_end, pay_date, jurisdiction_code')
    .eq('id', id)
    .eq('organization_id', session.organizationId)
    .maybeSingle()

  if (!run) notFound()

  // Empleados activos de la org con pay scheme actual
  const { data: employees } = await supabase
    .from('employees')
    .select(
      'id, first_name, last_name, employee_type, pay_schemes!inner(scheme_type, config)',
    )
    .eq('organization_id', session.organizationId)
    .eq('status', 'active')
    .is('pay_schemes.effective_to', null)
    .order('last_name')

  const { data: items } = await supabase
    .from('payroll_items')
    .select(
      'id, employee_id, hours_worked, days_worked, sales_amount_cents, units_produced, tips_cents, gross_cents, federal_tax_cents, state_tax_cents, local_tax_cents, social_security_cents, medicare_cents, other_deductions_cents, net_cents',
    )
    .eq('payroll_run_id', id)

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/payroll`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t('common.back')}
      </Link>

      <PayrollRunDetail run={run} employees={employees ?? []} items={items ?? []} locale={locale} />
    </div>
  )
}
