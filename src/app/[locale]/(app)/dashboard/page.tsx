import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { AlertTriangle, Clock, Users, DollarSign } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LiveMap, type MapPoint, type MapGeofence } from '@/components/admin/LiveMap'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { formatMoney } from '@/lib/utils'

export default async function DashboardPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  // KPIs del día
  const today = new Date().toISOString().slice(0, 10)
  const todayStart = `${today}T00:00:00Z`

  // 1) Active employees count
  const { count: activeEmployees } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .eq('organization_id', session.organizationId)

  // 2) Clocked-in NOW
  const { data: openEntries } = await supabase
    .from('time_entries')
    .select(
      'id, clock_in_at, clock_in_lat, clock_in_lng, clock_in_outside_geofence, employees!inner(first_name, last_name)',
    )
    .eq('organization_id', session.organizationId)
    .is('clock_out_at', null)

  // 3) Pending time entries
  const { count: pendingCount } = await supabase
    .from('time_entries')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', session.organizationId)
    .eq('status', 'pending')

  // 4) Hours today (entries con clock_in_at de hoy, sumando billable_minutes
  //    si están cerradas, o tiempo abierto en curso)
  const { data: todayEntries } = await supabase
    .from('time_entries')
    .select('billable_minutes, clock_in_at, clock_out_at')
    .eq('organization_id', session.organizationId)
    .gte('clock_in_at', todayStart)

  const totalMinutesToday = (todayEntries ?? []).reduce(
    (sum: number, e: { billable_minutes: number | null; clock_in_at: string; clock_out_at: string | null }) => {
      if (e.billable_minutes) return sum + e.billable_minutes
      // Entry abierto: calcular minutos transcurridos
      if (!e.clock_out_at) {
        const elapsed = Math.floor((Date.now() - new Date(e.clock_in_at).getTime()) / 60000)
        return sum + Math.max(0, elapsed)
      }
      return sum
    },
    0,
  )

  // 5) Worksites para el mapa
  const { data: worksites } = await supabase
    .from('worksites')
    .select('id, name, latitude, longitude, radius_m')
    .eq('organization_id', session.organizationId)
    .eq('is_active', true)

  // 6) Última payroll run
  const { data: lastRun } = await supabase
    .from('payroll_runs')
    .select('id, period_start, period_end, status')
    .eq('organization_id', session.organizationId)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Preparar puntos del mapa
  const mapPoints: MapPoint[] = (openEntries ?? [])
    .filter((e: { clock_in_lat: number | null; clock_in_lng: number | null }) => e.clock_in_lat && e.clock_in_lng)
    .map((e: { id: string; clock_in_lat: number; clock_in_lng: number; clock_in_at: string; clock_in_outside_geofence: boolean; employees: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] }) => {
      const emp = Array.isArray(e.employees) ? e.employees[0] : e.employees
      return {
        id: e.id,
        lat: Number(e.clock_in_lat),
        lng: Number(e.clock_in_lng),
        label: `${emp.first_name} ${emp.last_name}`,
        subtitle: `Since ${new Date(e.clock_in_at).toLocaleTimeString()}`,
        variant: e.clock_in_outside_geofence ? 'flagged' : 'normal',
      }
    })

  const mapGeofences: MapGeofence[] = (worksites ?? []).map((w: { id: string; name: string; latitude: number; longitude: number; radius_m: number }) => ({
    id: w.id,
    lat: Number(w.latitude),
    lng: Number(w.longitude),
    radius_m: w.radius_m,
    label: w.name,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.welcome')}</h1>
        <p className="text-muted-foreground">{t('dashboard.summary')}</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription>Active employees</CardDescription>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeEmployees ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription>Clocked in now</CardDescription>
            <Clock className="h-4 w-4 text-green-700" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{(openEntries ?? []).length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription>Hours today</CardDescription>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {(totalMinutesToday / 60).toFixed(1)}
              <span className="ml-1 text-base font-normal text-muted-foreground">h</span>
            </p>
          </CardContent>
        </Card>

        <Card className={pendingCount && pendingCount > 0 ? 'border-amber-300' : undefined}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription>Pending approvals</CardDescription>
            <AlertTriangle
              className={
                pendingCount && pendingCount > 0
                  ? 'h-4 w-4 text-amber-700'
                  : 'h-4 w-4 text-muted-foreground'
              }
            />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingCount ?? 0}</p>
            {pendingCount && pendingCount > 0 && (
              <Link
                href={`/${locale}/time-tracking`}
                className="text-xs text-primary hover:underline"
              >
                Review →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live map */}
      <Card>
        <CardHeader>
          <CardTitle>Live activity</CardTitle>
          <CardDescription>
            {mapPoints.length === 0
              ? 'Nobody is clocked in right now.'
              : `${mapPoints.length} ${mapPoints.length === 1 ? 'person' : 'people'} working`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LiveMap points={mapPoints} geofences={mapGeofences} height={400} />
        </CardContent>
      </Card>

      {/* Última nómina */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('dashboard.lastPayrollRun')}</CardTitle>
        </CardHeader>
        <CardContent>
          {lastRun ? (
            <Link
              href={`/${locale}/payroll/${lastRun.id}`}
              className="flex items-center justify-between hover:bg-accent rounded-md p-2 -m-2"
            >
              <div>
                <p className="font-medium">
                  {lastRun.period_start} → {lastRun.period_end}
                </p>
                <p className="text-sm capitalize text-muted-foreground">{lastRun.status}</p>
              </div>
              <span className="text-primary">View →</span>
            </Link>
          ) : (
            <p className="text-muted-foreground">{t('dashboard.noRunsYet')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
