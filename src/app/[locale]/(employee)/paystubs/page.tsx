import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { Card, CardContent } from '@/components/ui/card'
import { formatMoney } from '@/lib/utils'

export default async function PaystubsPage({
  params: { locale },
}: {
  params: { locale: string }
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

  const { data: items } = employee
    ? await supabase
        .from('payroll_items')
        .select(
          'id, gross_cents, net_cents, federal_tax_cents, social_security_cents, medicare_cents, payroll_runs!inner(period_start, period_end, pay_date, status)',
        )
        .eq('employee_id', employee.id)
        .in('payroll_runs.status', ['approved', 'paid', 'posted'])
        .order('payroll_runs(period_start)', { ascending: false })
        .limit(12)
    : { data: [] }

  return (
    <div className="container max-w-md space-y-3 py-6">
      <h1 className="text-2xl font-bold">{t('nav.paystubs')}</h1>

      {(items ?? []).map((it: { id: string; gross_cents: number; net_cents: number; federal_tax_cents: number; social_security_cents: number; medicare_cents: number; payroll_runs: { period_start: string; period_end: string; pay_date: string; status: string } | { period_start: string; period_end: string; pay_date: string; status: string }[] }) => {
        const run = Array.isArray(it.payroll_runs) ? it.payroll_runs[0] : it.payroll_runs
        return (
          <Link key={it.id} href={`/${locale}/paystubs/${it.id}`} className="block">
          <Card className="transition-colors hover:bg-accent">
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {run.period_start} → {run.period_end}
                  </p>
                  <p className="text-xs text-muted-foreground">Pay date: {run.pay_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatMoney(it.net_cents, locale)}</p>
                  <p className="text-xs text-muted-foreground">net</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Gross</p>
                  <p className="font-medium">{formatMoney(it.gross_cents, locale)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Taxes</p>
                  <p className="font-medium">
                    {formatMoney(
                      it.federal_tax_cents + it.social_security_cents + it.medicare_cents,
                      locale,
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          </Link>
        )
      })}

      {(!items || items.length === 0) && (
        <p className="py-12 text-center text-muted-foreground">{t('common.noData')}</p>
      )}
    </div>
  )
}
