'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'

// react-leaflet usa `window` y solo funciona client-side. Lazy-load para
// evitar errores en SSR.
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false })
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false })

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
 * Mapa interactivo basado en Leaflet + OpenStreetMap (gratis, sin API key).
 *
 * Muestra puntos de clock in/out de empleados y opcionalmente los círculos
 * de los worksites configurados (para visualizar el geofence).
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
  const [iconUrls, setIconUrls] = useState<{ icon: string; flagged: string } | null>(null)

  // Arreglo del bug clásico de Leaflet + bundlers: las URLs default de
  // markers están rotas. Generamos dataURLs SVG.
  useEffect(() => {
    setIconUrls({
      icon:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7 0 0 7 0 16c0 12 16 24 16 24s16-12 16-24c0-9-7-16-16-16z" fill="%232563eb"/><circle cx="16" cy="16" r="6" fill="white"/></svg>',
        ),
      flagged:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7 0 0 7 0 16c0 12 16 24 16 24s16-12 16-24c0-9-7-16-16-16z" fill="%23f59e0b"/><circle cx="16" cy="16" r="6" fill="white"/></svg>',
        ),
    })
  }, [])

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

  // Centro del mapa: promedio de coords si hay puntos, sino fallback NYC.
  const allPoints = [
    ...points.map((p) => ({ lat: p.lat, lng: p.lng })),
    ...(geofences ?? []).map((g) => ({ lat: g.lat, lng: g.lng })),
  ]
  const center =
    allPoints.length > 0
      ? {
          lat: allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length,
          lng: allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length,
        }
      : { lat: 40.7128, lng: -74.006 }

  return (
    <div className="overflow-hidden rounded-md border" style={{ height }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Worksites como círculos */}
        {(geofences ?? []).map((g) => (
          <Circle
            key={g.id}
            center={[g.lat, g.lng]}
            radius={g.radius_m}
            pathOptions={{ color: '#10b981', fillOpacity: 0.1 }}
          >
            <Popup>
              <strong>{g.label}</strong>
              <br />
              Radius: {g.radius_m}m
            </Popup>
          </Circle>
        ))}

        {/* Markers */}
        {iconUrls &&
          points.map((p) => {
            // Lazy import of L only for icon construction.
            // Evitamos el problema de Leaflet con tipos: usamos icon URL.
            return (
              <PointMarker
                key={p.id}
                point={p}
                iconUrl={p.variant === 'flagged' ? iconUrls.flagged : iconUrls.icon}
              />
            )
          })}
      </MapContainer>
    </div>
  )
}

function PointMarker({ point, iconUrl }: { point: MapPoint; iconUrl: string }) {
  const [icon, setIcon] = useState<unknown>(null)

  useEffect(() => {
    import('leaflet').then((L) => {
      setIcon(
        L.icon({
          iconUrl,
          iconSize: [32, 40],
          iconAnchor: [16, 40],
          popupAnchor: [0, -36],
        }),
      )
    })
  }, [iconUrl])

  if (!icon) return null

  return (
    <Marker position={[point.lat, point.lng]} icon={icon as never}>
      <Popup>
        <strong>{point.label}</strong>
        {point.subtitle && (
          <>
            <br />
            <small>{point.subtitle}</small>
          </>
        )}
      </Popup>
    </Marker>
  )
}
