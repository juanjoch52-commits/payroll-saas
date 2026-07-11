import { getTranslations } from 'next-intl/server'
import { AlertTriangle } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { requireContractor, contractorSubtreeIds } from '@/lib/auth/contractor'
import { buildRunSettlements } from '@/lib/subcontractors/settlement-data'
import { formatMoney, formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Callout } from '@/components/ui/callout'
import { Badge } from '@/components/ui/badge'
import { ContractorSettlementPdfButton } from '@/components/contractor/ContractorSettlementPdfButton'

// =============================================================================
// Portal del contratista — Mis liquidaciones
// =============================================================================
// Por cada nómina aprobada/pagada que incluye a su equipo: lo facturado a la
// empresa, HST, el TOTAL del cheque, lo que paga a su equipo y su margen.
// =============================================================================

export default async function MySettlementsPage({
  params: { locale },
}: {
  params: { locale: string }
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
  const { subtreeIds } = await contractorSubtreeIds(session.organizationId, sub.id)

  const { data: workers } = await admin
    .from('employees')
    .select('id')
    .eq('organization_id', session.organizationId)
    .in('subcontractor_id', subtreeIds)
  const empIds = ((workers ?? []) as { id: string }[]).map((w) => w.id)

  type RunRow = {
    payroll_run_id: string
    payroll_runs: {
      id: string
      period_start: string
      period_end: string
      pay_date: string
      status: string
    }
  }
  const { data: itemRuns } = empIds.length
    ? await admin
        .from('payroll_items')
        .select('payroll_run_id, payroll_runs!inner(id, period_start, period_end, pay_date, status)')
        .in('employee_id', empIds)
        .in('payroll_runs.status', ['approved', 'paid', 'posted'])
    : { data: [] }

  // Runs únicos, más recientes primero, cap 8 (cada uno arma su settlement).
  const runById = new Map<string, RunRow['payroll_runs']>()
  for (const r of (itemRuns ?? []) as unknown as RunRow[]) {
    const raw = r.payroll_runs as unknown
    const run = (Array.isArray(raw) ? raw[0] : raw) as RunRow['payroll_runs'] | undefined
    if (run) runById.set(run.id, run)
  }
  const runs = [...runById.values()]
    .sort((a, b) => (a.period_end < b.period_end ? 1 : -1))
    .slice(0, 8)

  const settlementByRun = await Promise.all(
    runs.map(async (run) => {
      const settlements = await buildRunSettlements(admin, session.organizationId, run.id)
      return { run, settlement: settlements.find((s) => s.rootId === sub.id) ?? null }
    }),
  )
  const withData = settlementByRun.filter((x) => x.settlement)

  return (
    <div className="container max-w-md space-y-4 py-6">
      <h1 className="text-2xl font-bold">{t('contractor.settlementsTitle')}</h1>

      {withData.map(({ run, settlement }) => (
        <Card key={run.id}>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {formatDate(run.period_start, locale)} – {formatDate(run.period_end, locale)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('contractor.payDate')}: {formatDate(run.pay_date, locale)}
                </p>
              </div>
              <Badge variant={run.status === 'paid' ? 'default' : 'secondary'}>
                {run.status === 'paid' ? t('contractor.paid') : t('contractor.approved')}
              </Badge>
            </div>

            {/* Desglose por trabajador (facturado) */}
            <div className="space-y-1 border-t pt-2">
              {settlement!.lines.map((l) => (
                <div key={l.employeeId} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {l.workerName}
                    {l.hours != null && ` · ${l.hours}h`}
                  </span>
                  <span className="tabular-nums">{formatMoney(l.billCents, locale)}</span>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="space-y-1 border-t pt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('contractor.subtotal')}</span>
                <span className="tabular-nums">{formatMoney(settlement!.subtotalCents, locale)}</span>
              </div>
              {settlement!.taxCents > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HST ({Number(settlement!.taxPct)}%)</span>
                  <span className="tabular-nums">{formatMoney(settlement!.taxCents, locale)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>{t('contractor.checkTotal')}</span>
                <span className="tabular-nums">{formatMoney(settlement!.totalCents, locale)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('contractor.youPayCrew')}</span>
                <span className="tabular-nums">{formatMoney(settlement!.payTotalCents, locale)}</span>
              </div>
              <div className="flex justify-between text-xs font-medium text-success-foreground">
                <span>{t('contractor.yourMargin')}</span>
                <span className="tabular-nums">{formatMoney(settlement!.marginCents, locale)}</span>
              </div>
            </div>

            <ContractorSettlementPdfButton runId={run.id} />
          </CardContent>
        </Card>
      ))}

      {withData.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">{t('contractor.noSettlements')}</p>
      )}
    </div>
  )
}
