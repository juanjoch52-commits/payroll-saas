// =============================================================================
// MyJova — Helpers de geolocalización
// =============================================================================
// Funciones puras (sin I/O), usables tanto en server como client.
// =============================================================================

const EARTH_RADIUS_M = 6_371_000

/**
 * Distancia entre dos puntos en la superficie terrestre (fórmula Haversine).
 * Devuelve metros.
 *
 *   haversineMeters(40.7128, -74.0060, 40.7589, -73.9851) ≈ 5450 metros
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_M * c
}

/**
 * Verifica si un punto está dentro del radio de un worksite.
 *
 *   isWithinGeofence({ lat: 40.7, lng: -74.0 }, { lat: 40.7, lng: -74.0, radius_m: 100 }) → true
 */
export function isWithinGeofence(
  point: { lat: number; lng: number },
  worksite: { latitude: number; longitude: number; radius_m: number },
): boolean {
  const dist = haversineMeters(point.lat, point.lng, worksite.latitude, worksite.longitude)
  return dist <= worksite.radius_m
}
