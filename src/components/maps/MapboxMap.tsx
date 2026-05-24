'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import mapboxgl, { type Map, type LngLatLike } from 'mapbox-gl'
import { useTheme } from 'next-themes'

import { MAP_STYLES, type MapStyle } from '@/lib/maps/style'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

export type MapboxMapHandle = {
  map: Map | null
  flyTo: (center: LngLatLike, zoom?: number) => void
}

export type MapboxMapProps = {
  /** Initial center [lng, lat] */
  center?: LngLatLike
  /** Initial zoom level (0-22) */
  zoom?: number
  /** Style key — defaults to light, will swap to dark if theme=dark */
  style?: MapStyle
  /** Force a specific style regardless of theme */
  forceStyle?: MapStyle
  /** Pitch (degrees, for 3D buildings) */
  pitch?: number
  /** Bearing (degrees) */
  bearing?: number
  /** Enable interaction (default true) */
  interactive?: boolean
  /** Container className */
  className?: string
  /** Children that need the map instance — pass via context or render after map ready */
  children?: React.ReactNode
  /** Called once when the map has loaded */
  onLoad?: (map: Map) => void
  /** Disable scroll zoom */
  scrollZoom?: boolean
}

/**
 * Wrapper genérico de Mapbox GL JS v3.
 *
 * - Si no hay NEXT_PUBLIC_MAPBOX_TOKEN configurado, renderiza un placeholder
 *   informativo en lugar del mapa (útil en desarrollo y para la landing
 *   pública si el deploy aún no tiene el token).
 * - Respeta theme dark/light automáticamente (style swap).
 * - Lazy-loaded (mapbox-gl es ~700kb, solo client-side).
 */
export const MapboxMap = forwardRef<MapboxMapHandle, MapboxMapProps>(function MapboxMap(
  {
    center = [-74.006, 40.7128] as LngLatLike, // NYC default
    zoom = 12,
    style: styleKey,
    forceStyle,
    pitch = 0,
    bearing = 0,
    interactive = true,
    className,
    children,
    onLoad,
    scrollZoom = false,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const { resolvedTheme } = useTheme()
  const [ready, setReady] = useState(false)

  useImperativeHandle(ref, () => ({
    get map() {
      return mapRef.current
    },
    flyTo(c, z) {
      mapRef.current?.flyTo({ center: c, zoom: z ?? mapRef.current.getZoom(), essential: true })
    },
  }))

  useEffect(() => {
    if (!containerRef.current || !TOKEN || mapRef.current) return

    mapboxgl.accessToken = TOKEN

    const effectiveStyle =
      forceStyle ?? styleKey ?? (resolvedTheme === 'dark' ? 'dark' : 'light')

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLES[effectiveStyle],
      center,
      zoom,
      pitch,
      bearing,
      interactive,
      attributionControl: true,
    })

    if (!scrollZoom) map.scrollZoom.disable()
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')

    map.on('load', () => {
      mapRef.current = map
      setReady(true)
      onLoad?.(map)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // Intentionally only re-init on container mount; style/center changes handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Swap style when theme changes (without re-init)
  useEffect(() => {
    if (!mapRef.current || forceStyle) return
    const target = styleKey ?? (resolvedTheme === 'dark' ? 'dark' : 'light')
    mapRef.current.setStyle(MAP_STYLES[target])
  }, [resolvedTheme, styleKey, forceStyle])

  if (!TOKEN) {
    return <MapPlaceholder className={className} />
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${className ?? ''}`}
    >
      {ready && children}
    </div>
  )
})

function MapPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-info/5 to-background ${className ?? ''}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(37,99,235,0.15),transparent_50%),radial-gradient(circle_at_70%_40%,rgba(16,185,129,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="relative max-w-sm rounded-lg border bg-background/90 px-4 py-3 text-center text-xs text-muted-foreground shadow-sm backdrop-blur">
        <p className="font-semibold text-foreground">Mapbox token not configured</p>
        <p className="mt-1">
          Set <code className="rounded bg-muted px-1 font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code>{' '}
          in <code className="rounded bg-muted px-1 font-mono">.env.local</code>
        </p>
      </div>
    </div>
  )
}
