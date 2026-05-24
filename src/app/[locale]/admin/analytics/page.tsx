import { createAdminClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/platform'
import { AnalyticsKPIs } from '@/components/admin/AnalyticsKPIs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AnalyticsCharts } from '@/components/admin/AnalyticsCharts'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  await requirePlatformAdmin(locale)
  const admin = createAdminClient()

  // Aggregate metrics
  const now = new Date()
  const day = 1000 * 60 * 60 * 24
  const since30 = new Date(now.getTime() - 30 * day).toISOString()
  const since7 = new Date(now.getTime() - 7 * day).toISOString()

  const [
    { count: totalOrgs },
    { count: activeSubs },
    { count: trialing },
    { count: totalEmployees },
    { data: recentOrgs },
    { data: recentClockEvents },
  ] = await Promise.all([
    admin.from('organizations').select('id', { count: 'exact', head: true }),
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'trialing'),
    admin.from('employees').select('id', { count: 'exact', head: true }),
    admin
      .from('organizations')
      .select('id, created_at')
      .gte('created_at', since30)
      .order('created_at', { ascending: true }),
    admin
      .from('time_entries')
      .select('clock_in_at')
      .gte('clock_in_at', since7)
      .order('clock_in_at', { ascending: true })
      .limit(5000),
  ])

  // Build daily signups for last 30 days
  const signupBuckets: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * day)
    const key = d.toISOString().slice(0, 10)
    signupBuckets.push({ date: key, count: 0 })
  }
  ;(recentOrgs ?? []).forEach((o) => {
    const key = o.created_at.slice(0, 10)
    const bucket = signupBuckets.find((b) => b.date === key)
    if (bucket) bucket.count++
  })

  // Build daily clock-ins for last 7 days
  const clockBuckets: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * day)
    const key = d.toISOString().slice(0, 10)
    clockBuckets.push({ date: key, count: 0 })
  }
  ;(recentClockEvents ?? []).forEach((e) => {
    const key = e.clock_in_at.slice(0, 10)
    const bucket = clockBuckets.find((b) => b.date === key)
    if (bucket) bucket.count++
  })

  // MRR estimate (sum of monthly_price for active subs)
  const { data: activeSubsWithPlans } = await admin
    .from('subscriptions')
    .select('plans:plan_id(monthly_price_cents)')
    .eq('status', 'active')

  const mrr =
    ((activeSubsWithPlans ?? []) as { plans?: { monthly_price_cents?: number } | { monthly_price_cents?: number }[] }[])
      .reduce((sum, s) => {
        const plan = Array.isArray(s.plans) ? s.plans[0] : s.plans
        return sum + (plan?.monthly_price_cents ?? 0)
      }, 0) / 100

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide growth, engagement and revenue metrics.
        </p>
      </header>

      <AnalyticsKPIs
        totalOrgs={totalOrgs ?? 0}
        activeSubs={activeSubs ?? 0}
        trialing={trialing ?? 0}
        totalEmployees={totalEmployees ?? 0}
        mrr={mrr}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Signups (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsCharts type="signups" data={signupBuckets} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Clock-ins (last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsCharts type="activity" data={clockBuckets} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
