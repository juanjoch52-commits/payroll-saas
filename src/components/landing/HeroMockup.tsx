import { Camera, Clock, MapPin, Wifi, Signal, Battery } from 'lucide-react'
import { LiveMap, type MapPoint, type MapGeofence } from '@/components/admin/LiveMap'

/**
 * Mockup del producto en el hero — dos cards lado a lado:
 *   - LiveMap mini con pins fake (3 trabajadores + 1 worksite)
 *   - Mobile phone frame mostrando el clock screen
 *
 * Coords centradas en Brooklyn (NYC) para tener un mapa visualmente rico.
 */

const FAKE_POINTS: MapPoint[] = [
  { id: '1', lat: 40.6892, lng: -73.9442, label: 'Maria G.', variant: 'normal' },
  { id: '2', lat: 40.6852, lng: -73.9512, label: 'Carlos R.', variant: 'normal' },
  { id: '3', lat: 40.6962, lng: -73.9382, label: 'James T.', variant: 'flagged' },
]

const FAKE_GEOFENCES: MapGeofence[] = [
  { id: 'g1', lat: 40.6892, lng: -73.9442, radius_m: 300, label: 'Brooklyn Job Site' },
]

export function HeroMockup({
  workerName,
  clockedSince,
  jobsiteLabel,
}: {
  workerName: string
  clockedSince: string
  jobsiteLabel: string
}) {
  return (
    <div className="relative flex items-center justify-center gap-4 lg:gap-6">
      {/* Map card */}
      <div className="hidden flex-1 overflow-hidden rounded-2xl border bg-card shadow-xl sm:block">
        <div className="border-b bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
          {jobsiteLabel}
        </div>
        <LiveMap points={FAKE_POINTS} geofences={FAKE_GEOFENCES} height={360} />
      </div>

      {/* Phone mockup */}
      <div className="relative w-[260px] shrink-0 sm:w-[280px]">
        {/* Phone frame */}
        <div className="overflow-hidden rounded-[2.5rem] border-[10px] border-foreground/90 bg-background shadow-2xl">
          {/* Status bar */}
          <div className="flex items-center justify-between bg-foreground/95 px-6 py-2 text-[10px] text-background">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <Signal className="h-3 w-3" />
              <Wifi className="h-3 w-3" />
              <Battery className="h-3 w-3" />
            </div>
          </div>

          {/* App content */}
          <div className="space-y-4 bg-background p-5 pb-8">
            {/* Header */}
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">MyJova</p>
              <p className="text-sm font-medium">{workerName}</p>
            </div>

            {/* Status card */}
            <div className="rounded-xl border bg-green-50 p-4 text-center dark:bg-green-950/30">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                <Clock className="h-6 w-6 text-green-700 dark:text-green-400" />
              </div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                Clocked in
              </p>
              <p className="text-xs text-muted-foreground">{clockedSince}</p>
              <p className="mt-2 text-xs font-medium">3h 14m so far</p>
            </div>

            {/* Photo preview */}
            <div className="flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>

            {/* Action button mockup */}
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className="pointer-events-none flex h-12 w-full items-center justify-center rounded-lg bg-destructive text-sm font-semibold text-destructive-foreground"
            >
              <Clock className="mr-2 h-4 w-4" />
              Clock out
            </button>

            {/* Geofence chip */}
            <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{jobsiteLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
