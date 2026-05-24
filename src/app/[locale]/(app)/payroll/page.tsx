import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

export default async function PayrollPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  const { data: runs } = await supabase
    .from('payroll_runs')
    .select('id, period_start, period_end, pay_date, status, name')
    .eq('organization_id', session.organizationId)
    .order('period_start', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('payroll.title')}</h1>
          <p className="text-muted-foreground">{runs?.length ?? 0} runs</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/payroll/new`}>
            <Plus className="mr-2 h-4 w-4" />
            {t('payroll.newRun')}
          </Link>
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">{t('payroll.payDate')}</th>
              <th className="px-4 py-3 font-medium">{t('common.actions')}</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(runs ?? []).map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Link
                    href={`/${locale}/payroll/${r.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {r.name ?? `${r.period_start} → ${r.period_end}`}
                  </Link>
                </td>
                <td className="px-4 py-3">{formatDate(r.pay_date, locale)}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 capitalize">{r.status}</td>
              </tr>
            ))}
            {(!runs || runs.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                  {t('common.noData')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
