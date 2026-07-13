import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { Badge } from '@/components/ui/badge'
import { formatMoney } from '@/lib/utils'
import { PaystubDownloadButton } from '@/components/employee/PaystubDownloadButton'

type Component = { component_type: string; code: string; label: string; amount_cents: number }
type RunRef = { period_start: string; period_end: string; pay_date: string; status: string }

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'muted' | 'info'> = {
  paid: 'success',
  posted: 'success',
  approved: 'info',
  draft: 'muted',
}

export default async function PaystubDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()

  if (!employee) notFound()

  const { data: item } = await supabase
    .from('payroll_items')
    .select(
      'id, gross_cents, net_cents, hours_worked, overtime_hours, days_worked, units_produced, payroll_runs!inner(period_start, period_end, pay_date, status), payroll_components(component_type, code, label, amount_cents)',
    )
    .eq('id', id)
    .eq('employee_id', employee.id)
    .single()

  if (!item) notFound()

  const run = (Array.isArray(item.payroll_runs) ? item.payroll_runs[0] : item.payroll_runs) as RunRef
  const comps = (item.payroll_components ?? []) as Component[]
  const earnings = comps.filter((c) => c.component_type === 'earning')
  const taxesAndDeductions = comps.filter(
    (c) => c.component_type === 'tax' || c.component_type === 'deduction',
  )

  return (
    <div className="container max-w-md space-y-4 py-6">
      <Link
        href={`/${locale}/paystubs`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('paystub.back')}
      </Link>

      {/* Cabecera */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium">
              {run.period_start} → {run.period_end}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('paystub.payDate')}: {run.pay_date}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[run.status] ?? 'muted'}>{run.status}</Badge>
        </div>
        <div className="mt-4 rounded-md bg-muted p-3 text-center">
          <p className="text-xs text-muted-foreground">{t('paystub.net')}</p>
          <p className="text-3xl font-bold">{formatMoney(item.net_cents, locale)}</p>
        </div>
      </div>

      {/* Ingresos */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('paystub.earnings')}
        </h2>
        <ul className="space-y-1.5 text-sm">
          {earnings.map((c, i) => (
            <li key={`e${i}`} className="flex justify-between">
              <span>{c.label}</span>
              <span className="font-medium">{formatMoney(c.amount_cents, locale)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t pt-3 font-semibold">
          <span>{t('paystub.gross')}</span>
          <span>{formatMoney(item.gross_cents, locale)}</span>
        </div>
      </div>

      {/* Impuestos y deducciones */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('paystub.deductions')}
        </h2>
        <ul className="space-y-1.5 text-sm">
          {taxesAndDeductions.map((c, i) => (
            <li key={`d${i}`} className="flex justify-between">
              <span>{c.label}</span>
              <span className="font-medium text-muted-foreground">
                -{formatMoney(c.amount_cents, locale)}
              </span>
            </li>
          ))}
          {taxesAndDeductions.length === 0 && (
            <li className="text-muted-foreground">{t('paystub.noDeductions')}</li>
          )}
        </ul>
        <div className="mt-3 flex justify-between border-t pt-3 font-semibold">
          <span>{t('paystub.net')}</span>
          <span>{formatMoney(item.net_cents, locale)}</span>
        </div>
      </div>

      <PaystubDownloadButton itemId={item.id} />
    </div>
  )
}
