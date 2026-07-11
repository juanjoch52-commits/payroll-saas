'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Map, List, Check, X, AlertTriangle, Pencil, MapPin } from 'lucide-react'
import { approveTimeEntry, rejectTimeEntry } from '@/app/actions/time-tracking'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LiveMap, type MapPoint, type MapGeofence } from './LiveMap'
import { formatDate } from '@/lib/utils'

type Entry = {
  id: string
  clock_in_at: string
  clock_out_at: string | null
  billable_minutes: number | null
  break_minutes: number | null
  break_waived: boolean
  manual_kind: 'full' | 'clock_out' | null
  manual_reason: string | null
  status: 'open' | 'pending' | 'approved' | 'rejected' | 'edited'
  clock_in_outside_geofence: boolean
  clock_out_outside_geofence: boolean
  clock_in_lat: number | null
  clock_in_lng: number | null
  clock_out_lat: number | null
  clock_out_lng: number | null
  employees: { id: string; first_name: string; last_name: string } | { id: string; first_name: string; last_name: string }[]
  worksites: { name: string } | { name: string }[] | null
}

/** Link externo a Google Maps con la coordenada exacta de la fichada. */
function MapsLink({ lat, lng, title }: { lat: number | null; lng: number | null; title: string }) {
  if (lat == null || lng == null) return null
  return (
    <a
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="ml-1 inline-flex align-middle text-muted-foreground hover:text-primary"
    >
      <MapPin className="h-3.5 w-3.5" />
    </a>
  )
}

type Worksite = {
  id: string
  name: string
  latitude: number
  longitude: number
  radius_m: number
}

export function TimeTrackingPanel({
  locale,
  entries,
  worksites,
  currentStatus,
}: {
  locale: string
  entries: Entry[]
  worksites: Worksite[]
  currentStatus: string
}) {
  const t = useTranslations()
  const router = useRouter()
  const [view, setView] = useState<'table' | 'map'>('table')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function toggleAll() {
    if (selected.size === entries.length) setSelected(new Set())
    else setSelected(new Set(entries.map((e) => e.id)))
  }

  function handleBulkApprove() {
    startTransition(async () => {
      await Promise.all(Array.from(selected).map((id) => approveTimeEntry(id)))
      setSelected(new Set())
      router.refresh()
    })
  }

  function handleBulkReject() {
    const notes = prompt('Reason for rejection:')
    if (!notes) return
    startTransition(async () => {
      await Promise.all(Array.from(selected).map((id) => rejectTimeEntry(id, notes)))
      setSelected(new Set())
      router.refresh()
    })
  }

  // Mapa: ENTRADAS (azul; ámbar si fuera del geofence) + SALIDAS (gris) — el
  // jefe ve exactamente dónde se fichó cada in y cada out.
  const mapPoints: MapPoint[] = entries.flatMap((e) => {
    const emp = Array.isArray(e.employees) ? e.employees[0] : e.employees
    const name = `${emp.first_name} ${emp.last_name}`
    const points: MapPoint[] = []
    if (e.clock_in_lat && e.clock_in_lng) {
      points.push({
        id: `${e.id}-in`,
        lat: Number(e.clock_in_lat),
        lng: Number(e.clock_in_lng),
        label: name,
        subtitle: `IN · ${new Date(e.clock_in_at).toLocaleString()}`,
        variant: e.clock_in_outside_geofence ? 'flagged' : 'normal',
      })
    }
    if (e.clock_out_at && e.clock_out_lat && e.clock_out_lng) {
      points.push({
        id: `${e.id}-out`,
        lat: Number(e.clock_out_lat),
        lng: Number(e.clock_out_lng),
        label: name,
        subtitle: `OUT · ${new Date(e.clock_out_at).toLocaleString()}`,
        variant: e.clock_out_outside_geofence ? 'flagged' : 'out',
      })
    }
    return points
  })

  const mapGeofences: MapGeofence[] = worksites.map((w) => ({
    id: w.id,
    lat: Number(w.latitude),
    lng: Number(w.longitude),
    radius_m: w.radius_m,
    label: w.name,
  }))

  return (
    <div className="space-y-4">
      {/* Filtros y vista */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-md border bg-muted/30 p-1">
          {(['pending', 'approved', 'rejected'] as const).map((s) => (
            <Link
              key={s}
              href={`/${locale}/time-tracking?status=${s}`}
              className={
                'rounded px-3 py-1 text-xs font-medium ' +
                (s === currentStatus
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground')
              }
            >
              {t(`timeTracking.${s}` as 'timeTracking.pending')}
            </Link>
          ))}
        </div>

        <div className="flex gap-1 rounded-md border bg-muted/30 p-1">
          <button
            onClick={() => setView('table')}
            className={
              'flex items-center gap-1 rounded px-3 py-1 text-xs font-medium ' +
              (view === 'table'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            <List className="h-3 w-3" /> {t('timeTracking.viewTable')}
          </button>
          <button
            onClick={() => setView('map')}
            className={
              'flex items-center gap-1 rounded px-3 py-1 text-xs font-medium ' +
              (view === 'map'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            <Map className="h-3 w-3" /> {t('timeTracking.viewMap')}
          </button>
        </div>

        {selected.size > 0 && (
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={handleBulkReject} disabled={pending}>
              <X className="mr-1 h-3 w-3" />
              {t('timeTracking.rejectSelected')} ({selected.size})
            </Button>
            <Button size="sm" onClick={handleBulkApprove} disabled={pending}>
              <Check className="mr-1 h-3 w-3" />
              {t('timeTracking.approveSelected')} ({selected.size})
            </Button>
          </div>
        )}
      </div>

      {view === 'map' ? (
        <Card>
          <CardContent className="p-0">
            <LiveMap points={mapPoints} geofences={mapGeofences} height={500} />
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={entries.length > 0 && selected.size === entries.length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">{t('timeTracking.clockInAt')}</th>
                <th className="px-4 py-3 font-medium">{t('timeTracking.clockOutAt')}</th>
                <th className="px-4 py-3 font-medium">{t('timeTracking.duration')}</th>
                <th className="px-4 py-3 font-medium">{t('timeTracking.worksite')}</th>
                <th className="px-4 py-3 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const emp = Array.isArray(e.employees) ? e.employees[0] : e.employees
                const worksite = Array.isArray(e.worksites) ? e.worksites[0] : e.worksites
                const minutes = e.billable_minutes ?? 0
                const h = Math.floor(minutes / 60)
                const m = minutes % 60
                return (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(e.id)}
                        onChange={() => toggle(e.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {emp.first_name} {emp.last_name}
                    </td>
                    <td className="px-4 py-3">
                      <div>{formatDate(e.clock_in_at, locale)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.clock_in_at).toLocaleTimeString()}
                        <MapsLink lat={e.clock_in_lat} lng={e.clock_in_lng} title="Clock-in location" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {e.clock_out_at ? (
                        <>
                          <div>{formatDate(e.clock_out_at, locale)}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(e.clock_out_at).toLocaleTimeString()}
                            <MapsLink lat={e.clock_out_lat} lng={e.clock_out_lng} title="Clock-out location" />
                          </div>
                        </>
                      ) : (
                        <Badge variant="success">{t('common.status.open')}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {e.billable_minutes ? `${h}h ${m}m` : '—'}
                      {(e.break_minutes ?? 0) > 0 && (
                        <div className="text-xs text-muted-foreground">
                          −{e.break_minutes}m {t('timeTracking.breakLabel')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {worksite?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {e.clock_in_outside_geofence && (
                          <Badge variant="warning" className="inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {t('timeTracking.flagged')}
                          </Badge>
                        )}
                        {e.manual_kind && (
                          <Badge
                            variant="secondary"
                            className="inline-flex items-center gap-1"
                            title={e.manual_reason ?? undefined}
                          >
                            <Pencil className="h-3 w-3" />
                            {t('timeTracking.manual')}
                          </Badge>
                        )}
                        {e.break_waived && (
                          <Badge variant="outline">{t('timeTracking.noLunchFlag')}</Badge>
                        )}
                      </div>
                      {e.manual_reason && (
                        <p className="mt-1 max-w-[16rem] truncate text-xs italic text-muted-foreground">
                          “{e.manual_reason}”
                        </p>
                      )}
                    </td>
                  </tr>
                )
              })}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    {t('timeTracking.noEntries')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
