import { getTranslations } from 'next-intl/server'
import { AlertTriangle, Percent } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { requireContractor, contractorSubtreeIds } from '@/lib/auth/contractor'
import { dayStartUtc, todayInTz } from '@/lib/time/tz'
import { addDays, mondayOfKey, formatMinutes } from '@/lib/timesheets/week'
import { formatMoney } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Callout } from '@/components/ui/callout'
import { Badge } from '@/components/ui/badge'

// =============================================================================
// Portal del contratista — Mi equipo
// =============================================================================
// SOLO su subtree: sus trabajadores, lo que les paga vs lo que factura a la
// empresa (bill rate: tabla privada, el trabajador nunca la ve), margen por
// hora y horas de la semana en curso. Lecturas via service role, siempre
// scoped al subtree verificado por subcontractors.user_id.
// =============================================================================

export default async function MyCrewPage({
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
  const { subtreeIds, subNameById } = await contractorSubtreeIds(session.organizationId, sub.id)

  const [{ data: workers }, { data: org }] = await Promise.all([
    admin
      .from('employees')
      .select('id, first_name, last_name, subcontractor_id, status')
      .eq('organization_id', session.organizationId)
      .in('subcontractor_id', subtreeIds)
      .eq('status', 'active')
      .order('first_name'),
    admin.from('organizations').select('timezone').eq('id', session.organizationId).maybeSingle(),
  ])

  type Worker = { id: string; first_name: string; last_name: string; subcontractor_id: string; status: string }
  const crew = (workers ?? []) as Worker[]
  const tz = (org as { timezone?: string } | null)?.timezone || 'America/New_York'
  const weekStart = mondayOfKey(todayInTz(tz))
  const empIds = crew.map((w) => w.id)

  const [{ data: billing }, { data: schemes }, { data: entries }] = empIds.length
    ? await Promise.all([
        admin.from('employee_billing').select('employee_id, bill_rate_cents').in('employee_id', empIds),
        admin
          .from('pay_schemes')
          .select('employee_id, scheme_type, config')
          .in('employee_id', empIds)
          .is('effective_to', null),
        admin
          .from('time_entries')
          .select('employee_id, billable_minutes, clock_out_at, status')
          .in('employee_id', empIds)
          .gte('clock_in_at', dayStartUtc(weekStart, tz))
          .lt('clock_in_at', dayStartUtc(addDays(weekStart, 7), tz)),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const billByEmp = new Map(
    ((billing ?? []) as { employee_id: string; bill_rate_cents: number | null }[]).map((b) => [
      b.employee_id,
      b.bill_rate_cents,
    ]),
  )
  const payByEmp = new Map(
    ((schemes ?? []) as { employee_id: string; scheme_type: string; config: { rateCents?: number } }[])
      .filter((s) => s.scheme_type === 'hourly' && s.config?.rateCents)
      .map((s) => [s.employee_id, s.config.rateCents as number]),
  )
  const weekMinByEmp = new Map<string, number>()
  for (const e of (entries ?? []) as {
    employee_id: string
    billable_minutes: number | null
    clock_out_at: string | null
    status: string
  }[]) {
    if (!e.clock_out_at || e.status === 'rejected') continue
    weekMinByEmp.set(e.employee_id, (weekMinByEmp.get(e.employee_id) ?? 0) + (e.billable_minutes ?? 0))
  }

  let totalMinutes = 0
  let estBilledCents = 0
  let estMarginCents = 0
  for (const w of crew) {
    const min = weekMinByEmp.get(w.id) ?? 0
    totalMinutes += min
    const bill = billByEmp.get(w.id)
    const pay = payByEmp.get(w.id)
    if (bill) estBilledCents += Math.round((min / 60) * bill)
    if (bill && pay) estMarginCents += Math.round((min / 60) * (bill - pay))
  }

  return (
    <div className="container max-w-md space-y-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">{t('contractor.crewTitle')}</h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {sub.name}
          {Number(sub.sales_tax_pct) > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Percent className="h-3 w-3" />
              HST {Number(sub.sales_tax_pct)}%
            </Badge>
          )}
        </p>
      </header>

      {/* Totales estimados de la semana en curso */}
      <Card>
        <CardContent className="grid grid-cols-3 divide-x py-3 text-center">
          <div>
            <p className="text-lg font-bold">{formatMinutes(totalMinutes)}</p>
            <p className="text-xs text-muted-foreground">{t('contractor.weekHours')}</p>
          </div>
          <div>
            <p className="text-lg font-bold">{formatMoney(estBilledCents, locale)}</p>
            <p className="text-xs text-muted-foreground">{t('contractor.weekBilled')}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-success-foreground">{formatMoney(estMarginCents, locale)}</p>
            <p className="text-xs text-muted-foreground">{t('contractor.weekMargin')}</p>
          </div>
        </CardContent>
      </Card>
      <p className="text-center text-xs text-muted-foreground">{t('contractor.estimateHint')}</p>

      {/* Equipo */}
      <div className="space-y-2">
        {crew.map((w) => {
          const bill = billByEmp.get(w.id)
          const pay = payByEmp.get(w.id)
          const min = weekMinByEmp.get(w.id) ?? 0
          const marginHr = bill && pay ? bill - pay : null
          const subName = subNameById.get(w.subcontractor_id)
          return (
            <Card key={w.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {w.first_name} {w.last_name}
                    </p>
                    {subName && subName !== sub.name && (
                      <p className="text-xs text-muted-foreground">{subName}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold">{formatMinutes(min)}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-xs text-muted-foreground">
                  {pay != null && (
                    <span>
                      {t('contractor.youPay')}: <strong>{formatMoney(pay, locale)}/h</strong>
                    </span>
                  )}
                  {bill != null && (
                    <span>
                      {t('contractor.youBill')}: <strong>{formatMoney(bill, locale)}/h</strong>
                    </span>
                  )}
                  {marginHr != null && (
                    <span className="text-success-foreground">
                      {t('contractor.margin')}: <strong>{formatMoney(marginHr, locale)}/h</strong>
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {crew.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">{t('contractor.noCrew')}</p>
      )}

      {/* Guía de inducción del contratista */}
      <p className="text-center">
        <a
          href={`/${locale}/my-guide`}
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t('contractor.helpLink')}
        </a>
      </p>
    </div>
  )
}
