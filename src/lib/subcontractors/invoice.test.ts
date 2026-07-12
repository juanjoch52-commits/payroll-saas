import { describe, expect, it } from 'vitest'
import { formatInvoiceNumber, invoiceLines } from './invoice'
import type { SettlementLine } from './tree'

const line = (over: Partial<SettlementLine>): SettlementLine => ({
  employeeId: 'e1',
  workerName: 'Worker',
  subName: 'Sub',
  hours: 10,
  payCents: 30000,
  billCents: 33000,
  marginCents: 3000,
  ...over,
})

describe('formatInvoiceNumber', () => {
  it('pad a 4 dígitos', () => {
    expect(formatInvoiceNumber(2026, 1)).toBe('INV-2026-0001')
    expect(formatInvoiceNumber(2026, 42)).toBe('INV-2026-0042')
    expect(formatInvoiceNumber(2027, 12345)).toBe('INV-2027-12345')
  })
})

describe('invoiceLines', () => {
  it('usa SOLO el lado facturado — nunca pay ni margen', () => {
    // Caso real de Juan: amigo a $30/h pagado, $33/h facturado.
    const [l] = invoiceLines([line({ workerName: 'Amigo', hours: 40, billCents: 132000 })])
    expect(l.amountCents).toBe(132000)
    expect(l.rateCents).toBe(3300) // $33/h implícita
    expect(JSON.stringify(l)).not.toContain('pay')
    expect(JSON.stringify(l)).not.toContain('margin')
  })

  it('describe trabajador — sub cuando difieren, solo trabajador si no', () => {
    const [a] = invoiceLines([line({ workerName: 'Ana', subName: 'Beta Plumbing' })])
    expect(a.description).toBe('Ana — Beta Plumbing')
    const [b] = invoiceLines([line({ workerName: 'Ana', subName: 'Ana' })])
    expect(b.description).toBe('Ana')
  })

  it('sin horas no hay tarifa implícita', () => {
    const [l] = invoiceLines([line({ hours: null })])
    expect(l.rateCents).toBeNull()
    expect(l.amountCents).toBe(33000)
  })

  it('la tarifa implícita redondea al centavo', () => {
    // 100.00 facturado / 3h = 33.333... → 3333
    const [l] = invoiceLines([line({ hours: 3, billCents: 10000 })])
    expect(l.rateCents).toBe(3333)
  })
})
