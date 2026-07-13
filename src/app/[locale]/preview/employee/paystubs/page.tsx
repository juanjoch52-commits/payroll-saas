import { Card, CardContent } from '@/components/ui/card'
import { MOCK_EMPLOYEE_SESSION } from '@/lib/preview/mock-data'
import { formatMoney } from '@/lib/utils'

export default async function PreviewEmployeePaystubsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  return (
    <div className="container max-w-md space-y-3 py-6">
      <h1 className="text-2xl font-bold">Pay stubs</h1>

      {MOCK_EMPLOYEE_SESSION.paystubs.map((stub) => (
        <Card key={stub.id}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{stub.period}</p>
                <p className="text-xs text-muted-foreground">Pay date: {stub.pay_date}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatMoney(stub.net, locale)}</p>
                <p className="text-xs text-muted-foreground">net</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Gross</p>
                <p className="font-medium">{formatMoney(stub.gross, locale)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Taxes</p>
                <p className="font-medium">{formatMoney(stub.taxes, locale)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
