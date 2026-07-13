import { createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'

export default async function PlatformOverviewPage() {
  const admin = createAdminClient()

  // Métricas globales — usando service role para saltar RLS
  const { count: tenantCount } = await admin
    .from('organizations')
    .select('id', { count: 'exact', head: true })

  const { count: activeSubsCount } = await admin
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: trialingCount } = await admin
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'trialing')

  const { count: employeeCount } = await admin
    .from('employees')
    .select('id', { count: 'exact', head: true })

  const { count: openShiftsCount } = await admin
    .from('time_entries')
    .select('id', { count: 'exact', head: true })
    .is('clock_out_at', null)

  // MRR estimado: Σ (base + trabajadores activos × por-trabajador) de subs activas.
  const { estimateMrrCents } = await import('@/lib/billing/seats')
  const mrr = (await estimateMrrCents(admin)) / 100

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Platform overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total tenants</CardDescription>
            <p className="text-3xl font-bold">{tenantCount ?? 0}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active subscriptions</CardDescription>
            <p className="text-3xl font-bold">{activeSubsCount ?? 0}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Trialing</CardDescription>
            <p className="text-3xl font-bold">{trialingCount ?? 0}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>MRR</CardDescription>
            <p className="text-3xl font-bold">
              ${mrr.toFixed(0)}
              <span className="ml-1 text-base font-normal text-muted-foreground">/mo</span>
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total employees</CardDescription>
            <p className="text-3xl font-bold">{employeeCount ?? 0}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Workers clocked in now</CardDescription>
            <p className="text-3xl font-bold">{openShiftsCount ?? 0}</p>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>About this view</CardDescription>
          <CardContent className="p-0 pt-2 text-sm text-muted-foreground">
            <p>
              This panel is for MyJova platform staff only. All queries here use the service role and
              bypass RLS. Treat with care — do not expose customer data without consent.
            </p>
          </CardContent>
        </CardHeader>
      </Card>
    </div>
  )
}
