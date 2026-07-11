import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { PayrollRunDetail } from '@/components/payroll/PayrollRunDetail'
import { SettlementDownloadButton } from '@/components/payroll/SettlementDownloadButton'
import { formatMoney } from '@/lib/utils'

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

  // Settlement de subcontratistas: un cheque por sub RAÍZ, con desglose de
  // horas por trabajador (incluye los trabajadores de sus subs menores).
  // Bill rates vienen de employee_billing (tabla privada) vía el helper.
  const { buildRunSettlements } = await import('@/lib/subcontractors/settlement-data')
  const settlements = await buildRunSettlements(
    supabase,
    session.organizationId,
    id,
    (items ?? []) as { employee_id: string; hours_worked: number | null; gross_cents: number }[],
  )

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

      {/* Settlement: un cheque por subcontratista RAÍZ, con desglose de horas */}
      {settlements.length > 0 && (
        <div className="rounded-md border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">{t('subcontractors.settlementTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('subcontractors.settlementHint')}</p>
          </div>
          <div className="divide-y">
            {settlements.map((s) => (
              <div key={s.rootId} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{s.rootName}</p>
                  <span className="flex items-center gap-3">
                    <SettlementDownloadButton runId={id} rootSubId={s.rootId} />
                    <p className="text-lg font-bold tabular-nums">{formatMoney(s.totalCents, locale)}</p>
                  </span>
                </div>
                <table className="mt-2 w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground/70">
                    <tr>
                      <th className="py-1 text-left font-medium">{t('subcontractors.worker')}</th>
                      <th className="py-1 text-left font-medium">Sub</th>
                      <th className="py-1 text-right font-medium">{t('subcontractors.hours')}</th>
                      <th className="py-1 text-right font-medium">{t('subcontractors.payWorker')}</th>
                      <th className="py-1 text-right font-medium">{t('subcontractors.billed')}</th>
                      <th className="py-1 text-right font-medium">{t('subcontractors.margin')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.lines.map((l) => (
                      <tr key={l.employeeId} className="text-muted-foreground">
                        <td className="py-1">{l.workerName}</td>
                        <td className="py-1">{l.subName}</td>
                        <td className="py-1 text-right tabular-nums">
                          {l.hours != null ? `${l.hours.toFixed(2)} h` : '—'}
                        </td>
                        <td className="py-1 text-right tabular-nums">{formatMoney(l.payCents, locale)}</td>
                        <td className="py-1 text-right tabular-nums">{formatMoney(l.billCents, locale)}</td>
                        <td className="py-1 text-right tabular-nums">
                          {l.marginCents !== 0 ? formatMoney(l.marginCents, locale) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 flex flex-wrap justify-end gap-x-6 gap-y-1 text-sm">
                  <span className="text-muted-foreground">
                    {t('subcontractors.subtotal')}:{' '}
                    <span className="tabular-nums">{formatMoney(s.subtotalCents, locale)}</span>
                  </span>
                  {s.taxPct > 0 && (
                    <span className="text-muted-foreground">
                      HST/GST ({s.taxPct}%):{' '}
                      <span className="tabular-nums">{formatMoney(s.taxCents, locale)}</span>
                    </span>
                  )}
                  {s.marginCents !== 0 && (
                    <span className="font-medium text-success-foreground">
                      {t('subcontractors.marginTotal')}:{' '}
                      <span className="tabular-nums">{formatMoney(s.marginCents, locale)}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
