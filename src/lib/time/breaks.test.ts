import { describe, it, expect } from 'vitest'
import { applyAutoBreak, breakPolicyActive, type BreakPolicy } from './breaks'
import { localTimeToUtc } from './tz'

// Política real de Juan: 30m de almuerzo cuando el turno llega a 6h.
const POLICY: BreakPolicy = { autoDeductMinutes: 30, thresholdMinutes: 360 }

describe('applyAutoBreak', () => {
  it('día completo (8h) descuenta 30m', () => {
    expect(applyAutoBreak(480, POLICY)).toEqual({ breakMinutes: 30, billableMinutes: 450 })
  })

  it('medio día (4h, bajo el umbral) no descuenta', () => {
    expect(applyAutoBreak(240, POLICY)).toEqual({ breakMinutes: 0, billableMinutes: 240 })
  })

  it('exactamente en el umbral (6h) sí descuenta', () => {
    expect(applyAutoBreak(360, POLICY)).toEqual({ breakMinutes: 30, billableMinutes: 330 })
  })

  it('día completo con "no tomé almuerzo" (waived) no descuenta', () => {
    expect(applyAutoBreak(480, POLICY, true)).toEqual({ breakMinutes: 0, billableMinutes: 480 })
  })

  it('política inactiva (0 min) o ausente no descuenta', () => {
    expect(applyAutoBreak(480, { autoDeductMinutes: 0, thresholdMinutes: 360 })).toEqual({
      breakMinutes: 0,
      billableMinutes: 480,
    })
    expect(applyAutoBreak(480, null)).toEqual({ breakMinutes: 0, billableMinutes: 480 })
    expect(breakPolicyActive(POLICY)).toBe(true)
    expect(breakPolicyActive(null)).toBe(false)
  })

  it('nunca deja el turno en negativo (umbral 0 + turno corto)', () => {
    expect(applyAutoBreak(20, { autoDeductMinutes: 30, thresholdMinutes: 0 })).toEqual({
      breakMinutes: 20,
      billableMinutes: 0,
    })
  })
})

describe('localTimeToUtc', () => {
  it('NY invierno (UTC-5): 08:00 local = 13:00Z', () => {
    expect(localTimeToUtc('2026-01-15', '08:00', 'America/New_York')).toBe('2026-01-15T13:00:00.000Z')
  })

  it('NY verano (UTC-4): 08:00 local = 12:00Z', () => {
    expect(localTimeToUtc('2026-07-10', '08:00', 'America/New_York')).toBe('2026-07-10T12:00:00.000Z')
  })

  it('día de spring-forward: tras el salto usa el offset nuevo (EDT)', () => {
    // 2026-03-08 02:00 EST no existe (salta a 03:00 EDT); a las 08:00 ya es EDT.
    expect(localTimeToUtc('2026-03-08', '08:00', 'America/New_York')).toBe('2026-03-08T12:00:00.000Z')
  })

  it('madrugada antes del salto sigue en EST', () => {
    expect(localTimeToUtc('2026-03-08', '01:00', 'America/New_York')).toBe('2026-03-08T06:00:00.000Z')
  })
})
