import { createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function MetricsPage() {
  const admin = createAdminClient()

  // Métricas mensuales últimos 6 meses
  const months: { label: string; start: string; end: string }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    months.push({
      label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      start: d.toISOString(),
      end: next.toISOString(),
    })
  }

  // Tenants creados por mes
  const tenantsCreatedPerMonth = await Promise.all(
    months.map(async (m) => {
      const { count } = await admin
        .from('organizations')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', m.start)
        .lt('created_at', m.end)
      return { label: m.label, value: count ?? 0 }
    }),
  )

  // Suscripciones canceladas por mes
  const churnedPerMonth = await Promise.all(
    months.map(async (m) => {
      const { count } = await admin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .gte('canceled_at', m.start)
        .lt('canceled_at', m.end)
      return { label: m.label, value: count ?? 0 }
    }),
  )

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
            <BarChart data={tenantsCreatedPerMonth} color="#2563eb" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Churn per month</CardTitle>
            <CardDescription>Subscriptions canceled</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={churnedPerMonth} color="#ef4444" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/** Mini bar chart usando solo HTML/CSS para no traer otra dep. */
function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-sm">
          <div className="w-20 text-xs text-muted-foreground">{d.label}</div>
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
