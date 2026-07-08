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
  const empIds = (items ?? []).map((i: { employee_id: string }) => i.employee_id)
  let settlements: import('@/lib/subcontractors/tree').Settlement[] = []
  if (empIds.length > 0) {
    const [{ data: subEmps }, { data: allSubs }] = await Promise.all([
      supabase
        .from('employees')
        .select('id, first_name, last_name, subcontractor_id')
        .in('id', empIds)
        .not('subcontractor_id', 'is', null),
      supabase
        .from('subcontractors')
        .select('id, parent_id, name')
        .eq('organization_id', session.organizationId),
    ])
    if (subEmps && subEmps.length > 0) {
      const { buildSettlements } = await import('@/lib/subcontractors/tree')
      const itemByEmp = new Map(
        (items ?? []).map((i: { employee_id: string; hours_worked: number | null; gross_cents: number }) => [
          i.employee_id,
          i,
        ]),
      )
      settlements = buildSettlements(
        (subEmps as { id: string; first_name: string; last_name: string; subcontractor_id: string }[])
          .map((e) => {
            const it = itemByEmp.get(e.id)
            if (!it) return null
            return {
              employeeId: e.id,
              workerName: `${e.first_name} ${e.last_name}`,
              subcontractorId: e.subcontractor_id,
              hours: it.hours_worked != null ? Number(it.hours_worked) : null,
              grossCents: it.gross_cents,
            }
          })
          .filter((x): x is NonNullable<typeof x> => x !== null),
        (allSubs ?? []) as { id: string; parent_id: string | null; name: string }[],
      )
    }
  }

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
                  <tbody>
                    {s.lines.map((l) => (
                      <tr key={l.employeeId} className="text-muted-foreground">
                        <td className="py-1">{l.workerName}</td>
                        <td className="py-1">{l.subName}</td>
                        <td className="py-1 text-right tabular-nums">
                          {l.hours != null ? `${l.hours.toFixed(2)} h` : '—'}
                        </td>
                        <td className="py-1 text-right tabular-nums">{formatMoney(l.grossCents, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
