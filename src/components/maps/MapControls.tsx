'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Map as MapIcon, Mountain, Satellite, Sun, Moon } from 'lucide-react'
import type { Map } from 'mapbox-gl'

import { MAP_STYLES, type MapStyle } from '@/lib/maps/style'
import { cn } from '@/lib/utils'

type ControlsProps = {
  map: Map | null
  defaultStyle?: MapStyle
  className?: string
}

const STYLES: { id: MapStyle; label: string; icon: React.ElementType }[] = [
  { id: 'streets', label: 'Streets', icon: MapIcon },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'satellite', label: 'Satellite', icon: Satellite },
]

/**
 * Botones flotantes para alternar entre estilos de mapa + toggle 3D buildings.
 */
export function MapControls({ map, defaultStyle = 'light', className }: ControlsProps) {
  const [style, setStyle] = useState<MapStyle>(defaultStyle)
  const [is3D, setIs3D] = useState(false)

  function changeStyle(s: MapStyle) {
    if (!map) return
    setStyle(s)
    map.setStyle(MAP_STYLES[s])
    // Re-apply 3D buildings if previously enabled
    if (is3D) {
      map.once('style.load', () => add3DBuildings(map))
    }
  }

  function toggle3D() {
    if (!map) return
    if (is3D) {
      try {
        map.removeLayer('3d-buildings')
      } catch {
        /* no-op */
      }
      map.easeTo({ pitch: 0 })
    } else {
      add3DBuildings(map)
      map.easeTo({ pitch: 50 })
    }
    setIs3D(!is3D)
  }

  return (
    <div className={cn('absolute left-3 top-3 z-[5] flex flex-col gap-2', className)}>
      <div className="overflow-hidden rounded-lg border bg-background/95 shadow-md backdrop-blur">
        {STYLES.map((s, i) => {
          const Icon = s.icon
          const active = s.id === style
          return (
            <button
              key={s.id}
              onClick={() => changeStyle(s.id)}
              className={cn(
                'relative flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                i !== STYLES.length - 1 && 'border-b',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
              {active && (
                <motion.span
                  layoutId="map-style-pill"
                  className="absolute inset-0 -z-10 bg-primary"
                />
              )}
            </button>
          )
        })}
      </div>

      <button
        onClick={toggle3D}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border bg-background/95 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur transition-colors hover:bg-accent',
          is3D && 'bg-primary text-primary-foreground hover:bg-primary',
        )}
      >
        <Mountain className="h-3.5 w-3.5" />
        3D
      </button>
    </div>
  )
}

function add3DBuildings(map: Map) {
  const layers = map.getStyle()?.layers ?? []
  // Find first symbol layer to insert under labels
  let firstSymbolId: string | undefined
  for (const layer of layers) {
    if (layer.type === 'symbol' && (layer as { layout?: { 'text-field'?: unknown } }).layout?.['text-field']) {
      firstSymbolId = layer.id
      break
    }
  }

  // Mapbox streets-v12 has a 'composite' source with building data
  try {
    map.addLayer(
      {
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14,
            0,
            14.05,
            ['get', 'height'],
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14,
            0,
            14.05,
            ['get', 'min_height'],
          ],
          'fill-extrusion-opacity': 0.6,
        },
      },
      firstSymbolId,
    )
  } catch {
    /* Style might not have the right source — silently skip */
  }
}
