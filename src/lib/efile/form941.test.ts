import { describe, it, expect } from 'vitest'
import { computeForm941, quarterDateRange, type Form941Input } from './form941'

const base: Form941Input = {
  year: 2026,
  quarter: 1,
  employeeCount: 4,
  wagesCents: 10_000_000,
  federalWithheldCents: 1_200_000,
  socialSecurityWagesCents: 10_000_000,
  medicareWagesCents: 10_000_000,
}

describe('computeForm941', () => {
  it('aplica 12.4% SS y 2.9% Medicare', () => {
    const r = computeForm941(base)
    expect(r.line5aTaxCents).toBe(1_240_000)
    expect(r.line5cTaxCents).toBe(290_000)
  })

  it('line 5e = suma de impuestos SS + Medicare', () => {
    const r = computeForm941(base)
    expect(r.line5eTotalTaxCents).toBe(1_240_000 + 290_000)
  })

  it('line 6 = federal withheld + 5e', () => {
    const r = computeForm941(base)
    expect(r.line6TotalCents).toBe(1_200_000 + 1_530_000)
    expect(r.line12TotalCents).toBe(r.line6TotalCents)
  })

  it('incluye SS tips (5b) y additional Medicare (5d)', () => {
    const r = computeForm941({
      ...base,
      socialSecurityTipsCents: 1_000_000, // 5b → ×0.124 = 124000
      additionalMedicareCents: 9_000, // 5d
    })
    expect(r.line5bTaxCents).toBe(124_000)
    expect(r.line5dAdditionalMedicareCents).toBe(9_000)
    expect(r.line5eTotalTaxCents).toBe(1_240_000 + 124_000 + 290_000 + 9_000)
  })

  it('propaga year/quarter/employeeCount/wages', () => {
    const r = computeForm941(base)
    expect(r.year).toBe(2026)
    expect(r.quarter).toBe(1)
    expect(r.line1EmployeeCount).toBe(4)
    expect(r.line2WagesCents).toBe(10_000_000)
  })

  it('redondea al centavo', () => {
    const r = computeForm941({ ...base, socialSecurityWagesCents: 12_345, medicareWagesCents: 12_345 })
    expect(r.line5aTaxCents).toBe(Math.round(12_345 * 0.124))
    expect(r.line5cTaxCents).toBe(Math.round(12_345 * 0.029))
  })
})

describe('quarterDateRange', () => {
  it('devuelve los rangos correctos por trimestre', () => {
    expect(quarterDateRange(2026, 1)).toEqual({ start: '2026-01-01', end: '2026-03-31' })
    expect(quarterDateRange(2026, 2)).toEqual({ start: '2026-04-01', end: '2026-06-30' })
    expect(quarterDateRange(2026, 3)).toEqual({ start: '2026-07-01', end: '2026-09-30' })
    expect(quarterDateRange(2026, 4)).toEqual({ start: '2026-10-01', end: '2026-12-31' })
  })

  it('maneja febrero bisiesto', () => {
    expect(quarterDateRange(2028, 1).end).toBe('2028-03-31')
    expect(quarterDateRange(2026, 1).end).toBe('2026-03-31')
  })
})
