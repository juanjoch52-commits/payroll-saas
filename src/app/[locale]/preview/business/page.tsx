import Link from 'next/link'
import { AlertTriangle, Clock, Users, DollarSign } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LiveMap } from '@/components/admin/LiveMap'
import { MOCK_LIVE_POINTS, MOCK_WORKSITES, MOCK_PAYROLL_RUNS, MOCK_EMPLOYEES } from '@/lib/preview/mock-data'
import { formatMoney } from '@/lib/utils'

export default async function BusinessDashboardPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const clockedInNow = MOCK_LIVE_POINTS.length
  const pendingApprovals = 2
  const hoursToday = 18.5
  const activeEmployees = MOCK_EMPLOYEES.filter((e) => e.status === 'active').length
  const lastRun = MOCK_PAYROLL_RUNS[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to MyJova</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening in your company.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription>Active employees</CardDescription>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeEmployees}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription>Clocked in now</CardDescription>
            <Clock className="h-4 w-4 text-green-700" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{clockedInNow}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription>Hours today</CardDescription>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {hoursToday}
              <span className="ml-1 text-base font-normal text-muted-foreground">h</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription>Pending approvals</CardDescription>
            <AlertTriangle className="h-4 w-4 text-amber-700" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingApprovals}</p>
            <Link
              href={`/${locale}/preview/business/time-tracking`}
              className="text-xs text-primary hover:underline"
            >
              Review →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Live map */}
      <Card>
        <CardHeader>
          <CardTitle>Live activity</CardTitle>
          <CardDescription>
            {clockedInNow} {clockedInNow === 1 ? 'person' : 'people'} working — 1 outside worksite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LiveMap points={MOCK_LIVE_POINTS} geofences={MOCK_WORKSITES} height={400} />
        </CardContent>
      </Card>

      {/* Last payroll run */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Last payroll run</CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            href={`/${locale}/preview/business/payroll`}
            className="flex items-center justify-between -m-2 rounded-md p-2 hover:bg-accent"
          >
            <div>
              <p className="font-medium">{lastRun.name}</p>
              <p className="text-sm text-muted-foreground">
                Pay date: {lastRun.pay_date} · {lastRun.employees} employees ·{' '}
                {formatMoney(lastRun.total_gross_cents, locale)} gross
              </p>
              <p className="mt-1 text-xs capitalize text-muted-foreground">{lastRun.status}</p>
            </div>
            <span className="text-primary">View →</span>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
