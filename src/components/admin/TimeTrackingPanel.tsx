'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Map, List, Check, X, AlertTriangle } from 'lucide-react'
import { approveTimeEntry, rejectTimeEntry } from '@/app/actions/time-tracking'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LiveMap, type MapPoint, type MapGeofence } from './LiveMap'
import { formatDate } from '@/lib/utils'

type Entry = {
  id: string
  clock_in_at: string
  clock_out_at: string | null
  billable_minutes: number | null
  status: 'open' | 'pending' | 'approved' | 'rejected' | 'edited'
  clock_in_outside_geofence: boolean
  clock_in_lat: number | null
  clock_in_lng: number | null
  employees: { id: string; first_name: string; last_name: string } | { id: string; first_name: string; last_name: string }[]
  worksites: { name: string } | { name: string }[] | null
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

  const mapPoints: MapPoint[] = entries
    .filter((e) => e.clock_in_lat && e.clock_in_lng)
    .map((e) => {
      const emp = Array.isArray(e.employees) ? e.employees[0] : e.employees
      return {
        id: e.id,
        lat: Number(e.clock_in_lat),
        lng: Number(e.clock_in_lng),
        label: `${emp.first_name} ${emp.last_name}`,
        subtitle: new Date(e.clock_in_at).toLocaleString(),
        variant: e.clock_in_outside_geofence ? 'flagged' : 'normal',
      }
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
                      </div>
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
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          Open
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {e.billable_minutes ? `${h}h ${m}m` : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {worksite?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {e.clock_in_outside_geofence && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                          <AlertTriangle className="h-3 w-3" />
                          {t('timeTracking.flagged')}
                        </span>
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
