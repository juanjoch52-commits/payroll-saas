import { AlertTriangle, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LiveMap } from '@/components/admin/LiveMap'
import { MOCK_TIME_ENTRIES, MOCK_WORKSITES } from '@/lib/preview/mock-data'
import { formatDate } from '@/lib/utils'

export default async function PreviewTimeTrackingPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const pending = MOCK_TIME_ENTRIES.filter((e) => e.status === 'pending' || e.status === 'open')

  const points = pending.map((e) => ({
    id: e.id,
    lat: e.lat,
    lng: e.lng,
    label: e.employee_name,
    subtitle: new Date(e.clock_in_at).toLocaleString(),
    variant: e.outside_geofence ? ('flagged' as const) : ('normal' as const),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Time tracking</h1>
        <p className="text-muted-foreground">{pending.length} pending review</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <LiveMap points={points} geofences={MOCK_WORKSITES} height={350} />
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-3"><input type="checkbox" /></th>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Clock in</th>
              <th className="px-4 py-3 font-medium">Clock out</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Worksite</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Flags</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_TIME_ENTRIES.map((e) => {
              const minutes = e.billable_minutes ?? 0
              const h = Math.floor(minutes / 60)
              const m = minutes % 60
              return (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3"><input type="checkbox" /></td>
                  <td className="px-4 py-3 font-medium">{e.employee_name}</td>
                  <td className="px-4 py-3">
                    <div>{formatDate(e.clock_in_at, locale)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(e.clock_in_at).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-4 py-3">
                    {e.clock_out_at ? (
                      <>
                        <div>{formatDate(e.clock_out_at, locale)}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(e.clock_out_at).toLocaleTimeString()}
                        </div>
                      </>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Open</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{e.billable_minutes ? `${h}h ${m}m` : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.worksite ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        e.status === 'approved'
                          ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700'
                          : e.status === 'rejected'
                            ? 'rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive'
                            : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700'
                      }
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {e.outside_geofence && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        Outside worksite
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button variant="outline">
          <X className="mr-2 h-4 w-4" />
          Reject selected
        </Button>
        <Button>
          <Check className="mr-2 h-4 w-4" />
          Approve selected
        </Button>
      </div>
    </div>
  )
}
