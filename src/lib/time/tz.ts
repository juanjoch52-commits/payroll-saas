// =============================================================================
// Helpers de timezone (puros) — fronteras de día en el timezone de la org
// =============================================================================
// Todo se almacena en UTC; estos helpers convierten instantes a "días" locales
// y días locales a instantes UTC, usando Intl (sin dependencias).
// =============================================================================

const DEFAULT_TZ = 'America/New_York'

/** 'YYYY-MM-DD' del instante `iso` visto en el timezone `tz`. */
export function dayKeyInTz(iso: string | Date, tz: string = DEFAULT_TZ): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTz(tz),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Instante UTC (ISO) en que EMPIEZA el día local `dateStr` (YYYY-MM-DD) en `tz`.
 * Estrategia: calcula el offset del tz en el mediodía UTC de esa fecha (evita
 * ambigüedades de DST a medianoche) y lo aplica.
 */
export function dayStartUtc(dateStr: string, tz: string = DEFAULT_TZ): string {
  const zone = safeTz(tz)
  const noonUtc = new Date(`${dateStr}T12:00:00Z`)
  const offsetMin = tzOffsetMinutes(noonUtc, zone)
  // Medianoche local = medianoche UTC - offset (offset = local - UTC).
  const startMs = Date.parse(`${dateStr}T00:00:00Z`) - offsetMin * 60_000
  return new Date(startMs).toISOString()
}

/** Instante UTC (ISO) en que TERMINA (exclusivo) el día local `dateStr` en `tz`. */
export function dayEndUtc(dateStr: string, tz: string = DEFAULT_TZ): string {
  const start = Date.parse(dayStartUtc(dateStr, tz))
  return new Date(start + 24 * 3_600_000).toISOString()
}

/** 'YYYY-MM-DD' de HOY en el timezone dado. */
export function todayInTz(tz: string = DEFAULT_TZ): string {
  return dayKeyInTz(new Date(), tz)
}

/**
 * Instante UTC (ISO) del "HH:MM" local de `dateStr` en `tz`.
 * Dos pasadas de offset: la primera estima con el offset del mediodía; la
 * segunda re-lee el offset en el instante estimado para acertar en los días
 * de cambio de DST. En la hora inexistente del spring-forward devuelve el
 * instante corrido (comportamiento estándar, sin lanzar).
 */
export function localTimeToUtc(dateStr: string, timeStr: string, tz: string = DEFAULT_TZ): string {
  const zone = safeTz(tz)
  const [hh, mm] = timeStr.split(':').map(Number)
  const wallClockUtcMs = Date.parse(`${dateStr}T00:00:00Z`) + (hh * 60 + mm) * 60_000

  let offsetMin = tzOffsetMinutes(new Date(`${dateStr}T12:00:00Z`), zone)
  let utcMs = wallClockUtcMs - offsetMin * 60_000
  const refined = tzOffsetMinutes(new Date(utcMs), zone)
  if (refined !== offsetMin) {
    offsetMin = refined
    utcMs = wallClockUtcMs - offsetMin * 60_000
  }
  return new Date(utcMs).toISOString()
}

/** Offset (minutos, local−UTC) del timezone en un instante dado. */
function tzOffsetMinutes(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(at)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'))
  return Math.round((asUtc - at.getTime()) / 60_000)
}

function safeTz(tz: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return tz
  } catch {
    return DEFAULT_TZ
  }
}

/** Timezones ofrecidos en Settings (mercado US + CA). */
export const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Winnipeg',
  'America/Edmonton',
  'America/Vancouver',
  'America/Halifax',
  'UTC',
] as const
