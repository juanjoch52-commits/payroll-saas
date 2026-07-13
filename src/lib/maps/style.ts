/**
 * Estilos Mapbox custom para MyJova.
 * Usamos styles publicados de Mapbox (no requieren tokens custom).
 *
 * Style URLs Mapbox v3:
 *   - mapbox://styles/mapbox/streets-v12
 *   - mapbox://styles/mapbox/light-v11
 *   - mapbox://styles/mapbox/dark-v11
 *   - mapbox://styles/mapbox/satellite-streets-v12
 *   - mapbox://styles/mapbox/navigation-day-v1
 *   - mapbox://styles/mapbox/navigation-night-v1
 */

export const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
} as const

export type MapStyle = keyof typeof MAP_STYLES

/** Brand palette para layers custom (clusters, geofences, danger zones) */
export const MAP_PALETTE = {
  primary: '#2563eb',
  primaryLight: '#60a5fa',
  primaryDark: '#1e40af',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  workerNormal: '#2563eb',
  workerFlagged: '#f59e0b',
  workerOffline: '#94a3b8',
  geofenceFill: 'rgba(16, 185, 129, 0.15)',
  geofenceStroke: '#10b981',
  dangerFill: 'rgba(239, 68, 68, 0.20)',
  dangerStroke: '#dc2626',
} as const

/** GeoJSON Feature helper para puntos con properties tipadas */
export function pointFeature<P extends Record<string, unknown>>(
  lat: number,
  lng: number,
  properties: P,
): GeoJSON.Feature<GeoJSON.Point, P> {
  return {
    type: 'Feature',
    properties,
    geometry: { type: 'Point', coordinates: [lng, lat] },
  }
}

export function pointCollection<P extends Record<string, unknown>>(
  features: GeoJSON.Feature<GeoJSON.Point, P>[],
): GeoJSON.FeatureCollection<GeoJSON.Point, P> {
  return { type: 'FeatureCollection', features }
}
