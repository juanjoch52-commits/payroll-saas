import { describe, it, expect } from 'vitest'
import { distributeTipPool } from './tips'

const sum = (rows: { amountCents: number }[]) => rows.reduce((a, r) => a + r.amountCents, 0)

describe('distributeTipPool', () => {
  it('reparte proporcionalmente al peso', () => {
    const rows = distributeTipPool(10000, [
      { employeeId: 'A', weightUnits: 60 },
      { employeeId: 'B', weightUnits: 40 },
    ])
    expect(rows).toEqual([
      { employeeId: 'A', amountCents: 6000 },
      { employeeId: 'B', amountCents: 4000 },
    ])
  })

  it('da el remanente al último para cuadrar exacto', () => {
    const rows = distributeTipPool(10001, [
      { employeeId: 'A', weightUnits: 1 },
      { employeeId: 'B', weightUnits: 1 },
      { employeeId: 'C', weightUnits: 1 },
    ])
    expect(sum(rows)).toBe(10001)
    expect(rows[2].amountCents).toBe(10001 - rows[0].amountCents - rows[1].amountCents)
  })

  it('la suma SIEMPRE iguala el total (sin perder centavos)', () => {
    for (const total of [1, 99, 100, 7777, 123456]) {
      const rows = distributeTipPool(total, [
        { employeeId: 'A', weightUnits: 3 },
        { employeeId: 'B', weightUnits: 5 },
        { employeeId: 'C', weightUnits: 2 },
      ])
      expect(sum(rows)).toBe(total)
    }
  })

  it('excluye a quien tiene peso 0 cuando hay otros con peso', () => {
    const rows = distributeTipPool(10000, [
      { employeeId: 'A', weightUnits: 120 },
      { employeeId: 'B', weightUnits: 0 },
      { employeeId: 'C', weightUnits: 60 },
    ])
    expect(rows.map((r) => r.employeeId)).toEqual(['A', 'C'])
    expect(sum(rows)).toBe(10000)
  })

  it('reparte por igual si NADIE tiene peso (fallback equitativo)', () => {
    const rows = distributeTipPool(9000, [
      { employeeId: 'A', weightUnits: 0 },
      { employeeId: 'B', weightUnits: 0 },
      { employeeId: 'C', weightUnits: 0 },
    ])
    expect(rows).toEqual([
      { employeeId: 'A', amountCents: 3000 },
      { employeeId: 'B', amountCents: 3000 },
      { employeeId: 'C', amountCents: 3000 },
    ])
  })

  it('devuelve [] para total 0 o sin participantes', () => {
    expect(distributeTipPool(0, [{ employeeId: 'A', weightUnits: 1 }])).toEqual([])
    expect(distributeTipPool(1000, [])).toEqual([])
  })
})
