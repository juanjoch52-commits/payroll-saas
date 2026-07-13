import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MOCK_PLATFORM_METRICS } from '@/lib/preview/mock-data'

export default async function PreviewMetricsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Metrics</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New tenants per month</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={MOCK_PLATFORM_METRICS.new_tenants_per_month} color="#2563eb" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Churn per month</CardTitle>
            <CardDescription>Subscriptions canceled</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={MOCK_PLATFORM_METRICS.churn_per_month} color="#ef4444" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-sm">
          <div className="w-24 text-xs text-muted-foreground">{d.label}</div>
          <div className="flex flex-1 items-center gap-2">
            <div
              className="h-6 rounded"
              style={{
                width: `${(d.value / max) * 100}%`,
                backgroundColor: color,
                minWidth: d.value > 0 ? 4 : 0,
              }}
            />
            <span className="text-xs font-medium">{d.value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
