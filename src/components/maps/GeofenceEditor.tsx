'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl, { type Map } from 'mapbox-gl'
import { Move, Maximize2 } from 'lucide-react'

import { MAP_PALETTE } from '@/lib/maps/style'

export type EditableGeofence = {
  lat: number
  lng: number
  radius_m: number
}

/**
 * Editor de geocercas inline sobre el mapa.
 *
 * - Click en el mapa → setea center
 * - Drag del marker → mueve center
 * - Slider en el panel → ajusta radius
 *
 * El parent recibe onChange con los valores actualizados y guarda en DB.
 */
export function GeofenceEditor({
  map,
  initial,
  onChange,
}: {
  map: Map | null
  initial: EditableGeofence
  onChange: (next: EditableGeofence) => void
}) {
  const [fence, setFence] = useState(initial)
  const markerRef = useRef<mapboxgl.Marker | null>(null)

  // Render circle source whenever fence changes
  useEffect(() => {
    if (!map) return
    const source = 'editor-geofence'
    const data = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: {},
          geometry: makeCirclePolygon(fence.lng, fence.lat, fence.radius_m, 64),
        },
      ],
    }
    if (!map.getSource(source)) {
      map.addSource(source, { type: 'geojson', data })
      map.addLayer({
        id: 'editor-geofence-fill',
        type: 'fill',
        source,
        paint: { 'fill-color': MAP_PALETTE.success, 'fill-opacity': 0.2 },
      })
      map.addLayer({
        id: 'editor-geofence-line',
        type: 'line',
        source,
        paint: { 'line-color': MAP_PALETTE.success, 'line-width': 2, 'line-dasharray': [2, 2] },
      })
    } else {
      ;(map.getSource(source) as mapboxgl.GeoJSONSource).setData(data)
    }

    // Marker for drag
    if (!markerRef.current) {
      const el = document.createElement('div')
      el.style.cssText =
        'width:24px;height:24px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px #2563eb;cursor:grab'
      markerRef.current = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([fence.lng, fence.lat])
        .addTo(map)
      markerRef.current.on('dragend', () => {
        const lngLat = markerRef.current!.getLngLat()
        const next = { ...fence, lat: lngLat.lat, lng: lngLat.lng }
        setFence(next)
        onChange(next)
      })
    } else {
      markerRef.current.setLngLat([fence.lng, fence.lat])
    }

    // Click on map to recenter (only outside the marker)
    const clickHandler = (e: mapboxgl.MapMouseEvent) => {
      const next = { ...fence, lat: e.lngLat.lat, lng: e.lngLat.lng }
      setFence(next)
      onChange(next)
    }
    map.on('click', clickHandler)
    return () => {
      map.off('click', clickHandler)
    }
  }, [map, fence, onChange])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        markerRef.current?.remove()
      } catch {
        /* no-op */
      }
    }
  }, [])

  function setRadius(r: number) {
    const next = { ...fence, radius_m: r }
    setFence(next)
    onChange(next)
  }

  return (
    <div className="absolute bottom-3 left-3 z-[5] flex flex-col gap-2 rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur sm:flex-row sm:items-center">
      <div className="flex items-center gap-2 text-xs">
        <Move className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">Drag marker or click to recenter</span>
      </div>
      <div className="flex items-center gap-2">
        <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="range"
          min={50}
          max={2000}
          step={25}
          value={fence.radius_m}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="h-1.5 w-40 cursor-pointer appearance-none rounded bg-muted accent-success"
        />
        <span className="min-w-[5ch] text-xs font-mono tabular-nums">
          {fence.radius_m}m
        </span>
      </div>
    </div>
  )
}

function makeCirclePolygon(
  centerLng: number,
  centerLat: number,
  radiusMeters: number,
  points = 64,
): GeoJSON.Polygon {
  const coords: [number, number][] = []
  const distanceX = radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180))
  const distanceY = radiusMeters / 110540
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI)
    coords.push([centerLng + distanceX * Math.cos(theta), centerLat + distanceY * Math.sin(theta)])
  }
  coords.push(coords[0])
  return { type: 'Polygon', coordinates: [coords] }
}
