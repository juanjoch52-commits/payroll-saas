import { describe, it, expect } from 'vitest'
import { annualSummary, yearsAvailable, annualCsv, type SettlementRecordRow } from './annual'

function rec(partial: Partial<SettlementRecordRow> & { pay_date: string }): SettlementRecordRow {
  return {
    payroll_run_id: partial.payroll_run_id ?? 'r1',
    subcontractor_id: partial.subcontractor_id ?? 'S',
    period_start: partial.period_start ?? partial.pay_date,
    period_end: partial.period_end ?? partial.pay_date,
    pay_date: partial.pay_date,
    subtotal_cents: partial.subtotal_cents ?? 100000,
    tax_pct: partial.tax_pct ?? 13,
    tax_cents: partial.tax_cents ?? 13000,
    total_cents: partial.total_cents ?? 113000,
    pay_total_cents: partial.pay_total_cents ?? 90000,
    margin_cents: partial.margin_cents ?? 10000,
  }
}

describe('annualSummary', () => {
  const records = [
    rec({ payroll_run_id: 'r1', pay_date: '2026-01-15' }),
    rec({ payroll_run_id: 'r2', pay_date: '2026-06-30' }),
    // Cheque pagado en enero del año SIGUIENTE por trabajo de diciembre:
    // cuenta en 2027 (base caja, por pay date).
    rec({ payroll_run_id: 'r3', pay_date: '2027-01-05', period_start: '2026-12-21', period_end: '2026-12-27' }),
  ]

  it('suma solo los runs del año elegido (por pay date, base caja)', () => {
    const s = annualSummary(records, 2026)
    expect(s.runs).toBe(2)
    expect(s.subtotalCents).toBe(200000)
    expect(s.taxCents).toBe(26000)
    expect(s.totalCents).toBe(226000)
    expect(s.payTotalCents).toBe(180000)
    expect(s.marginCents).toBe(20000)
  })

  it('el run pagado en enero siguiente cae en el año nuevo', () => {
    expect(annualSummary(records, 2027).runs).toBe(1)
  })

  it('año sin actividad → todo en cero', () => {
    const s = annualSummary(records, 2020)
    expect(s.runs).toBe(0)
    expect(s.totalCents).toBe(0)
  })

  it('yearsAvailable devuelve años únicos descendentes', () => {
    expect(yearsAvailable(records)).toEqual([2027, 2026])
  })
})

describe('annualCsv', () => {
  it('una fila por run + TOTAL que cuadra, con montos en dólares', () => {
    const records = [
      rec({ payroll_run_id: 'r1', pay_date: '2026-01-15' }),
      rec({ payroll_run_id: 'r2', pay_date: '2026-06-30' }),
    ]
    const csv = annualCsv('Juan Contracting', records, 2026)
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Contractor,Juan Contracting')
    expect(lines.filter((l) => l.startsWith('2026-')).length).toBe(2)
    const total = lines[lines.length - 1].split(',')
    expect(total[0]).toBe('TOTAL')
    expect(total[3]).toBe('2000.00') // subtotal
    expect(total[5]).toBe('2260.00') // cheques
  })

  it('escapa comas y comillas en el nombre', () => {
    const csv = annualCsv('Juan "El Grande", LLC', [rec({ pay_date: '2026-01-15' })], 2026)
    expect(csv.split('\r\n')[0]).toBe('Contractor,"Juan ""El Grande"", LLC"')
  })
})
