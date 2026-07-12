import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { AlertTriangle } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { requireContractor, contractorSubtreeIds } from '@/lib/auth/contractor'
import { buildRunSettlements } from '@/lib/subcontractors/settlement-data'
import { annualSummary, yearsAvailable, yearOf, type SettlementRecordRow } from '@/lib/subcontractors/annual'
import type { SettlementLine } from '@/lib/subcontractors/tree'
import { formatMoney, formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Callout } from '@/components/ui/callout'
import { Badge } from '@/components/ui/badge'
import { ContractorSettlementPdfButton } from '@/components/contractor/ContractorSettlementPdfButton'
import { SettlementsCsvButton } from '@/components/contractor/SettlementsCsvButton'
import { cn } from '@/lib/utils'

// =============================================================================
// Portal del contratista — Mis liquidaciones + REPORTE ANUAL de ingresos
// =============================================================================
// Fuente primaria: settlement_records (CONGELADOS al aprobar cada nómina —
// inmunes a cambios posteriores de asignación o tarifa). Fallback: cálculo en
// vivo solo para runs aprobados antes de que existieran los registros.
// Ingresos = facturado (+HST cobrado) · Gastos = pagado a su equipo · Margen.
// =============================================================================

type RecordWithLines = SettlementRecordRow & { lines: SettlementLine[]; runStatus: string }

export default async function MySettlementsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { year?: string }
}) {
  const t = await getTranslations()
  const { session, sub } = await requireContractor(locale)

  if (!sub) {
    return (
      <div className="container max-w-md py-6">
        <Callout variant="warning" icon={AlertTriangle} title={t('contractor.notLinked')}>
          {t('contractor.notLinkedHint')}
        </Callout>
      </div>
    )
  }

  const admin = createAdminClient()

  // 1) Registros congelados (fuente contable) + estado actual del run.
  const { data: recRows } = await admin
    .from('settlement_records')
    .select(
      'payroll_run_id, subcontractor_id, period_start, period_end, pay_date, subtotal_cents, tax_pct, tax_cents, total_cents, pay_total_cents, margin_cents, lines, payroll_runs!inner(status)',
    )
    .eq('subcontractor_id', sub.id)
    .eq('organization_id', session.organizationId)
    .order('pay_date', { ascending: false })

  let records: RecordWithLines[] = ((recRows ?? []) as unknown as (SettlementRecordRow & {
    lines: SettlementLine[]
    payroll_runs: { status: string } | { status: string }[]
  })[]).map((r) => {
    const run = Array.isArray(r.payroll_runs) ? r.payroll_runs[0] : r.payroll_runs
    return { ...r, runStatus: run?.status ?? 'approved' }
  })

  // 2) Fallback SOLO si no hay registros (runs aprobados antes de la migración):
  //    cálculo en vivo con los datos actuales, marcado como estimado.
  let isLive = false
  if (records.length === 0) {
    const { subtreeIds } = await contractorSubtreeIds(session.organizationId, sub.id)
    const { data: workers } = await admin
      .from('employees')
      .select('id')
      .eq('organization_id', session.organizationId)
      .in('subcontractor_id', subtreeIds.length ? subtreeIds : ['-'])
    const empIds = ((workers ?? []) as { id: string }[]).map((w) => w.id)

    if (empIds.length > 0) {
      const { data: itemRuns } = await admin
        .from('payroll_items')
        .select('payroll_run_id, payroll_runs!inner(id, period_start, period_end, pay_date, status)')
        .in('employee_id', empIds)
        .in('payroll_runs.status', ['approved', 'paid', 'posted'])
      type RunInfo = { id: string; period_start: string; period_end: string; pay_date: string; status: string }
      const runById = new Map<string, RunInfo>()
      for (const r of (itemRuns ?? []) as unknown as { payroll_runs: RunInfo | RunInfo[] }[]) {
        const raw = r.payroll_runs as unknown
        const run = (Array.isArray(raw) ? raw[0] : raw) as RunInfo | undefined
        if (run) runById.set(run.id, run)
      }
      const runs = [...runById.values()].sort((a, b) => (a.pay_date < b.pay_date ? 1 : -1)).slice(0, 24)
      const computed = await Promise.all(
        runs.map(async (run) => {
          const settlements = await buildRunSettlements(admin, session.organizationId, run.id)
          const s = settlements.find((x) => x.rootId === sub.id)
          if (!s) return null
          return {
            payroll_run_id: run.id,
            subcontractor_id: sub.id,
            period_start: run.period_start,
            period_end: run.period_end,
            pay_date: run.pay_date,
            subtotal_cents: s.subtotalCents,
            tax_pct: s.taxPct,
            tax_cents: s.taxCents,
            total_cents: s.totalCents,
            pay_total_cents: s.payTotalCents,
            margin_cents: s.marginCents,
            lines: s.lines,
            runStatus: run.status,
          } satisfies RecordWithLines
        }),
      )
      records = computed.filter((x): x is RecordWithLines => x !== null)
      isLive = records.length > 0
    }
  }

  // 3) Año seleccionado (por pay date, base caja).
  const years = yearsAvailable(records)
  const parsedYear = Number(searchParams.year)
  const year = years.includes(parsedYear) ? parsedYear : (years[0] ?? new Date().getUTCFullYear())
  const summary = annualSummary(records, year)
  const inYear = records.filter((r) => yearOf(r) === year)

  return (
    <div className="container max-w-md space-y-4 py-6">
      <h1 className="text-2xl font-bold">{t('contractor.settlementsTitle')}</h1>

      {isLive && (
        <p className="text-center text-xs text-muted-foreground">{t('contractor.liveEstimate')}</p>
      )}

      {/* Selector de año */}
      {years.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {years.map((y) => (
            <Link
              key={y}
              href={`/${locale}/my-settlements?year=${y}`}
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

      {/* Reporte anual: ingresos / gastos / margen */}
      {summary.runs > 0 && (
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-sm font-semibold">{t('contractor.annualTitle', { year })}</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('contractor.annualBilled')}</span>
                <span className="tabular-nums">{formatMoney(summary.subtotalCents, locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('contractor.annualHst')}</span>
                <span className="tabular-nums">{formatMoney(summary.taxCents, locale)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>{t('contractor.annualChecks', { count: summary.runs })}</span>
                <span className="tabular-nums">{formatMoney(summary.totalCents, locale)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('contractor.annualPaidCrew')}</span>
                <span className="tabular-nums">−{formatMoney(summary.payTotalCents, locale)}</span>
              </div>
              <div className="flex justify-between font-medium text-success-foreground">
                <span>{t('contractor.annualMargin')}</span>
                <span className="tabular-nums">{formatMoney(summary.marginCents, locale)}</span>
              </div>
            </div>
            <div className="pt-1">
              <SettlementsCsvButton year={year} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liquidaciones del año */}
      {inYear.map((rec) => (
        <Card key={rec.payroll_run_id}>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {formatDate(rec.period_start, locale)} – {formatDate(rec.period_end, locale)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('contractor.payDate')}: {formatDate(rec.pay_date, locale)}
                </p>
              </div>
              <Badge variant={rec.runStatus === 'paid' ? 'default' : 'secondary'}>
                {rec.runStatus === 'paid' ? t('contractor.paid') : t('contractor.approved')}
              </Badge>
            </div>

            <div className="space-y-1 border-t pt-2">
              {rec.lines.map((l) => (
                <div key={l.employeeId} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {l.workerName}
                    {l.hours != null && ` · ${l.hours}h`}
                  </span>
                  <span className="tabular-nums">{formatMoney(l.billCents, locale)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 border-t pt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('contractor.subtotal')}</span>
                <span className="tabular-nums">{formatMoney(rec.subtotal_cents, locale)}</span>
              </div>
              {rec.tax_cents > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HST ({Number(rec.tax_pct)}%)</span>
                  <span className="tabular-nums">{formatMoney(rec.tax_cents, locale)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>{t('contractor.checkTotal')}</span>
                <span className="tabular-nums">{formatMoney(rec.total_cents, locale)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('contractor.youPayCrew')}</span>
                <span className="tabular-nums">{formatMoney(rec.pay_total_cents, locale)}</span>
              </div>
              <div className="flex justify-between text-xs font-medium text-success-foreground">
                <span>{t('contractor.yourMargin')}</span>
                <span className="tabular-nums">{formatMoney(rec.margin_cents, locale)}</span>
              </div>
            </div>

            <ContractorSettlementPdfButton runId={rec.payroll_run_id} />
          </CardContent>
        </Card>
      ))}

      {records.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">{t('contractor.noSettlements')}</p>
      )}
    </div>
  )
}
