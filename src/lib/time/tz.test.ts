import { describe, it, expect } from 'vitest'
import { dayKeyInTz, dayStartUtc, dayEndUtc } from './tz'

describe('dayKeyInTz', () => {
  it('un instante 03:00 UTC es el día ANTERIOR en New York (UTC-5 invierno)', () => {
    expect(dayKeyInTz('2026-01-15T03:00:00Z', 'America/New_York')).toBe('2026-01-14')
  })

  it('el mismo instante en UTC es el día 15', () => {
    expect(dayKeyInTz('2026-01-15T03:00:00Z', 'UTC')).toBe('2026-01-15')
  })

  it('verano (EDT, UTC-4): 03:59 UTC sigue siendo el día anterior', () => {
    expect(dayKeyInTz('2026-07-10T03:59:00Z', 'America/New_York')).toBe('2026-07-09')
    expect(dayKeyInTz('2026-07-10T04:00:00Z', 'America/New_York')).toBe('2026-07-10')
  })

  it('timezone inválido cae al default sin lanzar', () => {
    expect(() => dayKeyInTz('2026-01-15T03:00:00Z', 'Bad/Zone')).not.toThrow()
  })
})

describe('dayStartUtc / dayEndUtc', () => {
  it('medianoche NY invierno = 05:00 UTC', () => {
    expect(dayStartUtc('2026-01-15', 'America/New_York')).toBe('2026-01-15T05:00:00.000Z')
  })

  it('medianoche NY verano = 04:00 UTC', () => {
    expect(dayStartUtc('2026-07-10', 'America/New_York')).toBe('2026-07-10T04:00:00.000Z')
  })

  it('en UTC el día empieza a las 00:00Z', () => {
    expect(dayStartUtc('2026-01-15', 'UTC')).toBe('2026-01-15T00:00:00.000Z')
  })

  it('el fin del día = inicio + 24h', () => {
    expect(dayEndUtc('2026-01-15', 'America/New_York')).toBe('2026-01-16T05:00:00.000Z')
  })

  it('un instante dentro del día local cae entre start y end', () => {
    const start = Date.parse(dayStartUtc('2026-01-15', 'America/Los_Angeles'))
    const end = Date.parse(dayEndUtc('2026-01-15', 'America/Los_Angeles'))
    const noonLocal = Date.parse('2026-01-15T20:00:00Z') // 12:00 PST
    expect(noonLocal).toBeGreaterThanOrEqual(start)
    expect(noonLocal).toBeLessThan(end)
  })
})
