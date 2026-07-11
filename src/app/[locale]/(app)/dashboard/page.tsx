import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  AlertTriangle,
  Clock,
  Users,
  Timer,
  Plus,
  Calculator,
  ClipboardCheck,
  FileText,
  CalendarCheck2,
  BookOpen,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Callout } from '@/components/ui/callout'
import { LiveMap, type MapPoint, type MapGeofence } from '@/components/admin/LiveMap'
import { canSee, type Role } from '@/components/layout/nav-config'
import { Onboarding } from '@/components/onboarding/Onboarding'
import { OnboardingChecklist, type ChecklistStep } from '@/components/onboarding/OnboardingChecklist'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

export default async function DashboardPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  // Timezone + estado de onboarding de la org (el "hoy" de los KPIs corta en
  // el día LOCAL de la org, no en UTC).
  const { data: org } = await supabase
    .from('organizations')
    .select('onboarding_state, timezone')
    .eq('id', session.organizationId)
    .maybeSingle()
  const orgTz = (org as { timezone?: string } | null)?.timezone ?? 'America/New_York'

  const { todayInTz, dayStartUtc } = await import('@/lib/time/tz')
  const today = todayInTz(orgTz)
  const todayStart = dayStartUtc(today, orgTz)

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

  // 3b) Semanas cerradas por los empleados esperando aprobación (pedidos de pago)
  const { count: submittedWeeks } = await supabase
    .from('timesheet_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', session.organizationId)
    .eq('status', 'submitted')

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

  // 7) Estado de onboarding (org ya cargada arriba junto al timezone).
  const onboarding =
    ((org as { onboarding_state?: { tourDismissed?: boolean; checklistDismissed?: boolean } } | null)
      ?.onboarding_state) ?? {}

  const { count: invitesCount } = await supabase
    .from('invitations')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', session.organizationId)

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

  const role = session.role as Role
  const pendingPositive = (pendingCount ?? 0) > 0

  // Acciones rápidas gateadas por rol.
  type QuickAction = { href: string; label: string; icon: React.ComponentType<{ className?: string }> }
  const quickActions: QuickAction[] = []
  if (canSee('manager', role)) {
    quickActions.push(
      { href: `/${locale}/employees/new`, label: t('employees.addEmployee'), icon: Plus },
      { href: `/${locale}/payroll/new`, label: t('dashboard.actions.runPayroll'), icon: Calculator },
      { href: `/${locale}/time-tracking`, label: t('dashboard.actions.reviewTime'), icon: ClipboardCheck },
    )
  }
  if (canSee('admin', role)) {
    quickActions.push({ href: `/${locale}/reports`, label: t('dashboard.actions.reports'), icon: FileText })
  }
  quickActions.push({ href: `/${locale}/guide`, label: t('dashboard.actions.guide'), icon: BookOpen })

  // Onboarding: checklist de primeros pasos (progreso real) + tour guiado.
  const showOnboarding = canSee('manager', role)
  const checklistSteps: ChecklistStep[] = [
    { key: 'addEmployee', href: `/${locale}/employees/new`, done: (activeEmployees ?? 0) > 0 },
    { key: 'addWorksite', href: `/${locale}/worksites`, done: (worksites ?? []).length > 0 },
    { key: 'runPayroll', href: `/${locale}/payroll/new`, done: !!lastRun },
    {
      key: 'inviteTeam',
      href: `/${locale}/employees`,
      done: (invitesCount ?? 0) > 0 || (activeEmployees ?? 0) > 1,
    },
  ]
  const checklistComplete = checklistSteps.every((s) => s.done)
  const showChecklist = showOnboarding && !onboarding.checklistDismissed && !checklistComplete

  return (
    <div className="space-y-6" data-tour="dashboard">
      <PageHeader title={t('dashboard.welcome')} description={t('dashboard.summary')} />

      {showChecklist && <OnboardingChecklist steps={checklistSteps} />}

      {/* Semanas cerradas por el equipo: pedidos de pago esperando revisión */}
      {(submittedWeeks ?? 0) > 0 && canSee('manager', role) && (
        <Callout variant="info" icon={CalendarCheck2} title={t('dashboard.submittedWeeks', { count: submittedWeeks ?? 0 })}>
          <Link href={`/${locale}/time-tracking`} className="font-medium text-primary hover:underline">
            {t('dashboard.reviewWeeks')} →
          </Link>
        </Callout>
      )}

      {/* Acciones rápidas */}
      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2" data-tour="quick-actions">
          {quickActions.map(({ href, label, icon: Icon }) => (
            <Button key={href} asChild variant="outline" size="sm">
              <Link href={href}>
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </Link>
            </Button>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="kpis">
        <StatCard label={t('dashboard.activeEmployees')} value={activeEmployees ?? 0} icon={Users} tone="primary" />
        <StatCard
          label={t('dashboard.clockedInNow')}
          value={(openEntries ?? []).length}
          icon={Clock}
          tone="success"
        />
        <StatCard
          label={t('dashboard.hoursToday')}
          value={
            <>
              {(totalMinutesToday / 60).toFixed(1)}
              <span className="ml-1 text-base font-normal text-muted-foreground">h</span>
            </>
          }
          icon={Timer}
          tone="info"
        />
        <StatCard
          label={t('dashboard.pendingApprovals')}
          value={pendingCount ?? 0}
          icon={AlertTriangle}
          tone="warning"
          highlight={pendingPositive}
          href={pendingPositive ? `/${locale}/time-tracking` : undefined}
          hint={pendingPositive ? <span className="text-primary">{t('dashboard.review')} →</span> : undefined}
        />
      </div>

      {/* Actividad en vivo + última nómina */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" data-tour="live-activity">
          <CardHeader>
            <CardTitle>{t('dashboard.liveActivity')}</CardTitle>
            <CardDescription>
              {mapPoints.length === 0
                ? t('dashboard.nobodyClockedIn')
                : `${mapPoints.length} ${t('dashboard.working')}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LiveMap points={mapPoints} geofences={mapGeofences} height={400} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('dashboard.lastPayrollRun')}</CardTitle>
          </CardHeader>
          <CardContent>
            {lastRun ? (
              <Link
                href={`/${locale}/payroll/${lastRun.id}`}
                className="-m-2 flex items-center justify-between rounded-md p-2 hover:bg-accent"
              >
                <div>
                  <p className="font-medium">
                    {lastRun.period_start} → {lastRun.period_end}
                  </p>
                  <p className="text-sm capitalize text-muted-foreground">{lastRun.status}</p>
                </div>
                <span className="text-primary">{t('dashboard.view')} →</span>
              </Link>
            ) : (
              <p className="text-muted-foreground">{t('dashboard.noRunsYet')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {showOnboarding && <Onboarding tourDismissed={!!onboarding.tourDismissed} />}
    </div>
  )
}
