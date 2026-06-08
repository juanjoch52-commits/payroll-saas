import { describe, it, expect } from 'vitest'
import { calcLocalTax, localityName, LOCALITY_CODES } from './local'

describe('calcLocalTax', () => {
  it('aplica la tasa de NYC al bruto gravable', () => {
    // 100000c (=$1000) * 0.03078 = 3078c
    expect(calcLocalTax('NYC', 100000)).toBe(3078)
  })

  it('aplica la tasa de Philadelphia', () => {
    // 100000c * 0.0375 = 3750c
    expect(calcLocalTax('PHL', 100000)).toBe(3750)
  })

  it('aplica la tasa de Yonkers', () => {
    // 100000c * 0.01577 = 1577c
    expect(calcLocalTax('YON', 100000)).toBe(1577)
  })

  it('es insensible a mayúsculas/minúsculas', () => {
    expect(calcLocalTax('nyc', 100000)).toBe(3078)
  })

  it('redondea al centavo más cercano', () => {
    expect(calcLocalTax('YON', 12345)).toBe(Math.round(12345 * 0.01577))
  })

  it('devuelve 0 para una localidad desconocida', () => {
    expect(calcLocalTax('ZZZ', 100000)).toBe(0)
  })

  it('devuelve 0 cuando no se especifica localidad', () => {
    expect(calcLocalTax(undefined, 100000)).toBe(0)
    expect(calcLocalTax('', 100000)).toBe(0)
  })
})

describe('localityName / LOCALITY_CODES', () => {
  it('resuelve el nombre legible (insensible a mayúsculas)', () => {
    expect(localityName('NYC')).toBe('New York City')
    expect(localityName('phl')).toBe('Philadelphia')
  })

  it('devuelve undefined para código ausente o desconocido', () => {
    expect(localityName(undefined)).toBeUndefined()
    expect(localityName('ZZZ')).toBeUndefined()
  })

  it('expone los códigos disponibles', () => {
    expect(LOCALITY_CODES).toEqual(expect.arrayContaining(['NYC', 'PHL', 'YON']))
  })
})
