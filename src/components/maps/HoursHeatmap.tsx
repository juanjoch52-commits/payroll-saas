'use client'

import { useEffect } from 'react'
import type { Map, GeoJSONSource } from 'mapbox-gl'

import { pointCollection, pointFeature } from '@/lib/maps/style'

export type HeatmapEntry = {
  lat: number
  lng: number
  weight: number // 0..1 representing hours intensity
}

/**
 * Capa de heatmap mostrando densidad de horas trabajadas por ubicación.
 * Se monta sobre el mismo Map instance del MapboxMap parent.
 */
export function HoursHeatmap({ map, entries }: { map: Map | null; entries: HeatmapEntry[] }) {
  useEffect(() => {
    if (!map || entries.length === 0) return

    const source = 'hours-heatmap'
    const layerId = 'hours-heatmap-layer'

    if (!map.getSource(source)) {
      map.addSource(source, {
        type: 'geojson',
        data: pointCollection(
          entries.map((e) =>
            pointFeature(e.lat, e.lng, { weight: e.weight }),
          ),
        ),
      })
    } else {
      ;(map.getSource(source) as GeoJSONSource).setData(
        pointCollection(
          entries.map((e) =>
            pointFeature(e.lat, e.lng, { weight: e.weight }),
          ),
        ),
      )
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'heatmap',
        source,
        maxzoom: 18,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 18, 3],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33,102,172,0)',
            0.2, 'rgb(103,169,207)',
            0.4, 'rgb(209,229,240)',
            0.6, 'rgb(253,219,199)',
            0.8, 'rgb(239,138,98)',
            1, 'rgb(178,24,43)',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 18, 30],
          'heatmap-opacity': 0.75,
        },
      })
    }

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId)
        if (map.getSource(source)) map.removeSource(source)
      } catch {
        /* map may already be unmounted */
      }
    }
  }, [map, entries])

  return null
}
