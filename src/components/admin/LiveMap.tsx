/**
 * Re-export del LiveMap unificado de Mapbox.
 *
 * Mantiene el path antiguo `@/components/admin/LiveMap` para no romper imports
 * existentes en dashboard, time-tracking, worksites y preview pages.
 */
export { LiveMap, type MapPoint, type MapGeofence } from '@/components/maps/LiveMap'
