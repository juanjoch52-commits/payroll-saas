'use client'

import { useEffect } from 'react'
import type { Map, GeoJSONSource } from 'mapbox-gl'

import { MAP_PALETTE } from '@/lib/maps/style'

export type DangerZone = {
  id: string
  lat: number
  lng: number
  radius_m: number
  reason?: string
}

/**
 * Pinta zonas peligrosas con animación de pulso usando 2 capas circle
 * (una sólida + una con stroke ancho que se expande).
 *
 * Útil para visualizar geocercas violadas, áreas no autorizadas, o
 * incidentes en tiempo real.
 */
export function DangerZoneLayer({
  map,
  zones,
}: {
  map: Map | null
  zones: DangerZone[]
}) {
  useEffect(() => {
    if (!map || zones.length === 0) return

    const source = 'danger-zones'
    const fillId = 'danger-zones-fill'
    const pulseId = 'danger-zones-pulse'

    const data = {
      type: 'FeatureCollection' as const,
      features: zones.map((z) => ({
        type: 'Feature' as const,
        properties: { id: z.id, reason: z.reason ?? '' },
        geometry: { type: 'Point' as const, coordinates: [z.lng, z.lat] },
      })),
    }

    if (!map.getSource(source)) {
      map.addSource(source, { type: 'geojson', data })
    } else {
      ;(map.getSource(source) as GeoJSONSource).setData(data)
    }

    if (!map.getLayer(fillId)) {
      map.addLayer({
        id: fillId,
        type: 'circle',
        source,
        paint: {
          'circle-radius': 12,
          'circle-color': MAP_PALETTE.danger,
          'circle-opacity': 0.7,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      })
    }

    if (!map.getLayer(pulseId)) {
      map.addLayer({
        id: pulseId,
        type: 'circle',
        source,
        paint: {
          'circle-radius': 24,
          'circle-color': MAP_PALETTE.danger,
          'circle-opacity': 0,
          'circle-stroke-color': MAP_PALETTE.danger,
          'circle-stroke-width': 2,
          'circle-stroke-opacity': 0.4,
        },
      })
    }

    // Animate the pulse using setPaintProperty in a loop
    let raf = 0
    let start = performance.now()
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000 // sec
      const cycle = (Math.sin(elapsed * Math.PI) + 1) / 2 // 0..1
      try {
        map.setPaintProperty(pulseId, 'circle-radius', 24 + cycle * 12)
        map.setPaintProperty(pulseId, 'circle-stroke-opacity', 0.5 - cycle * 0.4)
      } catch {
        // Layer disappeared mid-tick
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      try {
        if (map.getLayer(pulseId)) map.removeLayer(pulseId)
        if (map.getLayer(fillId)) map.removeLayer(fillId)
        if (map.getSource(source)) map.removeSource(source)
      } catch {
        /* unmounted */
      }
    }
  }, [map, zones])

  return null
}
