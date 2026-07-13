import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { annualSummary, yearsAvailable, yearOf, type SettlementRecordRow } from '@/lib/subcontractors/annual'
import { formatMoney, cn } from '@/lib/utils'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { FileSpreadsheet } from 'lucide-react'
import { SettlementsCsvButton } from '@/components/contractor/SettlementsCsvButton'

// =============================================================================
// Reportes → Liquidaciones por contratista (vista de la EMPRESA)
// =============================================================================
// Lee de settlement_records (congelados al aprobar): cuánto se facturó, HST,
// cheques, pagado a equipos y margen POR CONTRATISTA en el año elegido, con
// CSV por contratista para contabilidad. Cada contratista ve su propio total
// idéntico en su portal — misma fuente, imposible que difieran.
// =============================================================================

type RecordWithSub = SettlementRecordRow & {
  subcontractors: { name: string } | { name: string }[]
}

export default async function SettlementsReportPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { year?: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return <p className="p-6 text-destructive">{t('errors.unauthorized')}</p>
  }

  const supabase = createClient()
  const { data } = await supabase
    .from('settlement_records')
    .select(
      'payroll_run_id, subcontractor_id, period_start, period_end, pay_date, subtotal_cents, tax_pct, tax_cents, total_cents, pay_total_cents, margin_cents, subcontractors!inner(name)',
    )
    .eq('organization_id', session.organizationId)
    .order('pay_date', { ascending: false })
    .limit(2000)

  const records = (data ?? []) as unknown as RecordWithSub[]
  const years = yearsAvailable(records)
  const parsedYear = Number(searchParams.year)
  const year = years.includes(parsedYear) ? parsedYear : (years[0] ?? new Date().getUTCFullYear())
  const inYear = records.filter((r) => yearOf(r) === year)

  // Agrupar por contratista raíz.
  const bySub = new Map<string, { name: string; records: SettlementRecordRow[] }>()
  for (const r of inYear) {
    const subName = (Array.isArray(r.subcontractors) ? r.subcontractors[0] : r.subcontractors)?.name ?? '—'
    const g = bySub.get(r.subcontractor_id) ?? { name: subName, records: [] }
    g.records.push(r)
    bySub.set(r.subcontractor_id, g)
  }
  const rows = [...bySub.entries()]
    .map(([subId, g]) => ({ subId, name: g.name, summary: annualSummary(g.records, year) }))
    .sort((a, b) => b.summary.totalCents - a.summary.totalCents)

  const grand = annualSummary(inYear, year)

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/reports`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t('common.back')}
      </Link>

      <PageHeader title={t('reports.settlementsTitle')} description={t('reports.settlementsDesc')} />

      {years.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {years.map((y) => (
            <Link
              key={y}
              href={`/${locale}/reports/settlements?year=${y}`}
              className={cn(
                'rounded-full border px-3 py-1 text-sm',
                y === year
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {y}
            </Link>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title={t('reports.settlementsEmpty')}
          description={t('reports.settlementsEmptyDesc')}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('reports.colContractor')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('reports.colRuns')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('reports.colBilled')}</th>
                  <th className="px-4 py-3 text-right font-medium">HST</th>
                  <th className="px-4 py-3 text-right font-medium">{t('reports.colChecks')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('reports.colPaidCrew')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('reports.colMargin')}</th>
                  <th className="px-4 py-3 font-medium">CSV</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ subId, name, summary }) => (
                  <tr key={subId} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{summary.runs}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(summary.subtotalCents, locale)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(summary.taxCents, locale)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatMoney(summary.totalCents, locale)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {formatMoney(summary.payTotalCents, locale)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-success-foreground">
                      {formatMoney(summary.marginCents, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <SettlementsCsvButton year={year} subcontractorId={subId} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/20 font-semibold">
                  <td className="px-4 py-3">{t('reports.colTotal')}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{grand.runs}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(grand.subtotalCents, locale)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(grand.taxCents, locale)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(grand.totalCents, locale)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(grand.payTotalCents, locale)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(grand.marginCents, locale)}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
