import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { MOCK_PLATFORM_METRICS } from '@/lib/preview/mock-data'

export default async function PreviewPlatformOverviewPage() {
  const m = MOCK_PLATFORM_METRICS

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Platform overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total tenants</CardDescription>
            <p className="text-3xl font-bold">{m.total_tenants}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active subscriptions</CardDescription>
            <p className="text-3xl font-bold">{m.active_subscriptions}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Trialing</CardDescription>
            <p className="text-3xl font-bold">{m.trialing}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>MRR</CardDescription>
            <p className="text-3xl font-bold">
              ${m.mrr.toLocaleString()}
              <span className="ml-1 text-base font-normal text-muted-foreground">/mo</span>
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Past due</CardDescription>
            <p className="text-3xl font-bold text-amber-700">{m.past_due}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total employees</CardDescription>
            <p className="text-3xl font-bold">{m.total_employees}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Workers clocked in now</CardDescription>
            <p className="text-3xl font-bold text-green-700">{m.workers_clocked_in_now}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>ARR (projected)</CardDescription>
            <p className="text-3xl font-bold">
              ${(m.mrr * 12).toLocaleString()}
            </p>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>About this view</CardDescription>
          <CardContent className="p-0 pt-2 text-sm text-muted-foreground">
            <p>
              This panel is for MyJova platform staff only. All queries here use the service role
              and bypass RLS. Treat with care — do not expose customer data without consent.
            </p>
          </CardContent>
        </CardHeader>
      </Card>
    </div>
  )
}
