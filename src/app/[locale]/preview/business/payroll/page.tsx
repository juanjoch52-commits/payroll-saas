import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { MOCK_PAYROLL_RUNS } from '@/lib/preview/mock-data'
import { formatDate, formatMoney } from '@/lib/utils'

export default async function PreviewPayrollPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const totalGrossYTD = MOCK_PAYROLL_RUNS.reduce((s, r) => s + r.total_gross_cents, 0)
  const totalNetYTD = MOCK_PAYROLL_RUNS.reduce((s, r) => s + r.total_net_cents, 0)
  const totalTaxesYTD = totalGrossYTD - totalNetYTD

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground">{MOCK_PAYROLL_RUNS.length} runs · YTD totals below</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New payroll run
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Gross paid YTD</CardDescription>
            <p className="text-2xl font-bold">{formatMoney(totalGrossYTD, locale)}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Taxes withheld YTD</CardDescription>
            <p className="text-2xl font-bold">{formatMoney(totalTaxesYTD, locale)}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Net paid YTD</CardDescription>
            <p className="text-2xl font-bold">{formatMoney(totalNetYTD, locale)}</p>
          </CardHeader>
        </Card>
      </div>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Pay date</th>
              <th className="px-4 py-3 font-medium">Employees</th>
              <th className="px-4 py-3 font-medium">Gross</th>
              <th className="px-4 py-3 font-medium">Net</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PAYROLL_RUNS.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3">{formatDate(r.pay_date, locale)}</td>
                <td className="px-4 py-3">{r.employees}</td>
                <td className="px-4 py-3">{formatMoney(r.total_gross_cents, locale)}</td>
                <td className="px-4 py-3 font-medium">{formatMoney(r.total_net_cents, locale)}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      r.status === 'paid'
                        ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700'
                        : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700'
                    }
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
