import { describe, it, expect } from 'vitest'
import { accrualForPeriod, applyAccrual } from './accrual'

describe('accrualForPeriod', () => {
  it('hours_per_period devuelve la tasa tal cual', () => {
    expect(accrualForPeriod('hours_per_period', 2.5, 26)).toBe(2.5)
  })

  it('days_per_year convierte a horas por período (10 días × 8h / 26)', () => {
    expect(accrualForPeriod('days_per_year', 10, 26)).toBe(3.08)
  })

  it('none y tasas inválidas devuelven 0', () => {
    expect(accrualForPeriod('none', 5, 26)).toBe(0)
    expect(accrualForPeriod('hours_per_period', 0, 26)).toBe(0)
    expect(accrualForPeriod('hours_per_period', -1, 26)).toBe(0)
    expect(accrualForPeriod('days_per_year', 10, 0)).toBe(0)
  })
})

describe('applyAccrual', () => {
  it('suma al saldo actual', () => {
    expect(applyAccrual(10, 2.5)).toBe(12.5)
  })

  it('respeta el tope máximo', () => {
    expect(applyAccrual(79, 2, 80)).toBe(80)
  })

  it('sin tope no recorta', () => {
    expect(applyAccrual(79, 2, null)).toBe(81)
  })

  it('saldo no numérico se trata como 0', () => {
    expect(applyAccrual(NaN, 2)).toBe(2)
  })
})
