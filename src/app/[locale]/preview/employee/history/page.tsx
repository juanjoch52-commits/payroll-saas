import { Card, CardContent } from '@/components/ui/card'
import { MOCK_EMPLOYEE_SESSION } from '@/lib/preview/mock-data'

export default async function PreviewEmployeeHistoryPage() {
  return (
    <div className="container max-w-md space-y-3 py-6">
      <h1 className="text-2xl font-bold">History</h1>

      {MOCK_EMPLOYEE_SESSION.history.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">{entry.date}</p>
              <p className="text-xs text-muted-foreground">
                {entry.clock_in} → {entry.clock_out}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{entry.hours}h</p>
              <p className="text-xs text-green-700">{entry.status}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
