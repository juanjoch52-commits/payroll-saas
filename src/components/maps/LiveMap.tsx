'use client'

import { useEffect, useRef } from 'react'
import mapboxgl, { type Map, type LngLatLike } from 'mapbox-gl'

import { MapboxMap, type MapboxMapHandle } from './MapboxMap'
import { MAP_PALETTE, pointCollection, pointFeature } from '@/lib/maps/style'

export type MapPoint = {
  id: string
  lat: number
  lng: number
  label: string
  subtitle?: string
  variant?: 'normal' | 'flagged'
}

export type MapGeofence = {
  id: string
  lat: number
  lng: number
  radius_m: number
  label: string
}

/**
 * Mapa en vivo con Mapbox GL v3.
 *
 * Sustituto drop-in del LiveMap anterior basado en Leaflet — mantiene la misma
 * API pública (points, geofences, height) para que páginas existentes funcionen
 * sin cambios. Internamente:
 *   - clustering automático (zoom out → clusters)
 *   - markers HTML con popups
 *   - geofences renderizados como círculos (turf-like) en source GeoJSON
 *   - auto-fit a los bounds combinados
 *
 * Cuando `NEXT_PUBLIC_MAPBOX_TOKEN` no está configurado, MapboxMap muestra un
 * placeholder visual; este componente no aporta interacción en ese caso pero
 * tampoco rompe el árbol de UI.
 */
export function LiveMap({
  points,
  geofences,
  height = 400,
}: {
  points: MapPoint[]
  geofences?: MapGeofence[]
  height?: number
}) {
  const ref = useRef<MapboxMapHandle>(null)

  // Compute center + initial bounds
  const allPoints = [
    ...points.map((p) => ({ lat: p.lat, lng: p.lng })),
    ...(geofences ?? []).map((g) => ({ lat: g.lat, lng: g.lng })),
  ]
  const center: LngLatLike =
    allPoints.length > 0
      ? [
          allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length,
          allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length,
        ]
      : ([-74.006, 40.7128] as LngLatLike)

  function onLoad(map: Map) {
    // Workers source + cluster layers
    if (points.length > 0) {
      map.addSource('workers', {
        type: 'geojson',
        data: pointCollection(
          points.map((p) =>
            pointFeature(p.lat, p.lng, {
              id: p.id,
              label: p.label,
              subtitle: p.subtitle ?? '',
              variant: p.variant ?? 'normal',
            }),
          ),
        ),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      })

      map.addLayer({
        id: 'workers-clusters',
        type: 'circle',
        source: 'workers',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': MAP_PALETTE.primary,
          'circle-opacity': 0.85,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32],
        },
      })

      map.addLayer({
        id: 'workers-cluster-count',
        type: 'symbol',
        source: 'workers',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
        },
        paint: { 'text-color': '#fff' },
      })

      map.addLayer({
        id: 'workers-points',
        type: 'circle',
        source: 'workers',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'match',
            ['get', 'variant'],
            'flagged',
            MAP_PALETTE.workerFlagged,
            MAP_PALETTE.workerNormal,
          ],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2.5,
        },
      })

      // Popups
      map.on('click', 'workers-points', (e) => {
        const f = e.features?.[0]
        if (!f || f.geometry.type !== 'Point') return
        const coords = f.geometry.coordinates as [number, number]
        const { label, subtitle } = f.properties as { label: string; subtitle?: string }
        new mapboxgl.Popup({ closeButton: true })
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:sans-serif"><strong>${escape(label)}</strong>${
              subtitle ? `<br/><small style="opacity:.7">${escape(subtitle)}</small>` : ''
            }</div>`,
          )
          .addTo(map)
      })

      map.on('mouseenter', 'workers-points', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'workers-points', () => {
        map.getCanvas().style.cursor = ''
      })

      // Zoom into cluster on click
      map.on('click', 'workers-clusters', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const clusterId = (f.properties as { cluster_id?: number }).cluster_id
        const source = map.getSource('workers') as mapboxgl.GeoJSONSource
        if (clusterId === undefined) return
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return
          const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
          map.easeTo({ center: coords, zoom })
        })
      })
    }

    // Geofences as polygons (approximated circle)
    if (geofences && geofences.length > 0) {
      map.addSource('geofences', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: geofences.map((g) => ({
            type: 'Feature',
            properties: { id: g.id, label: g.label, radius_m: g.radius_m },
            geometry: makeCirclePolygon(g.lng, g.lat, g.radius_m, 64),
          })),
        },
      })

      map.addLayer({
        id: 'geofences-fill',
        type: 'fill',
        source: 'geofences',
        paint: { 'fill-color': MAP_PALETTE.success, 'fill-opacity': 0.15 },
      })
      map.addLayer({
        id: 'geofences-outline',
        type: 'line',
        source: 'geofences',
        paint: { 'line-color': MAP_PALETTE.success, 'line-width': 2 },
      })

      map.on('click', 'geofences-fill', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const coords = (f.geometry as GeoJSON.Polygon).coordinates[0][0] as [number, number]
        const { label, radius_m } = f.properties as { label: string; radius_m: number }
        new mapboxgl.Popup({ closeButton: true })
          .setLngLat(coords)
          .setHTML(`<strong>${escape(label)}</strong><br/><small>Radius: ${radius_m}m</small>`)
          .addTo(map)
      })
    }

    // Auto-fit bounds (single point or geofence + single point case)
    if (allPoints.length > 1) {
      const bounds = new mapboxgl.LngLatBounds()
      allPoints.forEach((p) => bounds.extend([p.lng, p.lat]))
      map.fitBounds(bounds, { padding: 60, duration: 0 })
    }
  }

  if (points.length === 0 && (!geofences || geofences.length === 0)) {
    return (
      <div
        className="flex items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground"
        style={{ height }}
      >
        No locations to show.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border" style={{ height }}>
      <MapboxMap ref={ref} center={center} zoom={13} onLoad={onLoad} />
    </div>
  )
}

// Simple HTML escape for popup safety
function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!),
  )
}

/** Generate a polygon approximating a geographic circle in meters. */
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
