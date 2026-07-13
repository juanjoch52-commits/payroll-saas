import { describe, expect, it } from 'vitest'

import { convertFromUSD, currencyForCountry, formatPrice } from './currency'

// Mercado atendido: US + Canadá. EUR se eliminó de la landing (2026-07-12):
// cualquier visitante fuera de CA — incluida Europa — debe ver USD.
describe('currencyForCountry', () => {
  it('CA → CAD (único mercado con conversión)', () => {
    expect(currencyForCountry('CA')).toBe('CAD')
    expect(currencyForCountry('ca')).toBe('CAD')
  })

  it('US y desconocidos → USD', () => {
    expect(currencyForCountry('US')).toBe('USD')
    expect(currencyForCountry(null)).toBe('USD')
    expect(currencyForCountry(undefined)).toBe('USD')
    expect(currencyForCountry('')).toBe('USD')
  })

  it('Europa ya NO mapea a EUR — cae en USD', () => {
    for (const c of ['FR', 'ES', 'DE', 'IT', 'BE', 'CH', 'NL', 'PT']) {
      expect(currencyForCountry(c)).toBe('USD')
    }
  })

  it('LatAm → USD', () => {
    for (const c of ['MX', 'AR', 'CL', 'CO', 'PE']) {
      expect(currencyForCountry(c)).toBe('USD')
    }
  })
})

describe('convertFromUSD', () => {
  it('USD es identidad', () => {
    expect(convertFromUSD(29, 'USD')).toBe(29)
  })

  it('CAD redondea a entero (29 USD ≈ 40 CAD @1.37)', () => {
    expect(convertFromUSD(29, 'CAD')).toBe(40)
  })
})

describe('formatPrice', () => {
  it('sin centavos por defecto', () => {
    expect(formatPrice(29, 'USD', 'en')).toBe('$29')
  })

  it('CAD usa el formato de la locale', () => {
    // en-US formatea CAD como CA$40
    expect(formatPrice(40, 'CAD', 'en')).toContain('40')
  })
})
