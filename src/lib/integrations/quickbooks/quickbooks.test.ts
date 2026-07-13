import { describe, it, expect } from 'vitest'
import { sumTotals, buildJournalEntry, isMappingComplete } from './mapping'
import { buildIif, buildCsv } from './iif'

const item = {
  gross_cents: 100000,
  net_cents: 80000,
  federal_tax_cents: 10000,
  social_security_cents: 6200,
  medicare_cents: 1450,
  state_tax_cents: 2350,
  other_deductions_cents: 0,
}
// gross = net + fed + ss + medicare + state → 80000+10000+6200+1450+2350 = 100000 ✓

const fullMapping = {
  wageExpense: '1',
  cash: '2',
  federalLiability: '3',
  ssLiability: '4',
  medicareLiability: '5',
  stateLiability: '6',
}

describe('QuickBooks mapping', () => {
  it('sumTotals agrega correctamente', () => {
    const totals = sumTotals([item, item])
    expect(totals.grossCents).toBe(200000)
    expect(totals.netCents).toBe(160000)
  })

  it('el JournalEntry balancea (débitos = créditos)', () => {
    const totals = sumTotals([item])
    const je = buildJournalEntry(totals, fullMapping, '2026-05-31')
    const debits = je.Line.filter((l) => l.JournalEntryLineDetail.PostingType === 'Debit').reduce(
      (s, l) => s + l.Amount,
      0,
    )
    const credits = je.Line.filter((l) => l.JournalEntryLineDetail.PostingType === 'Credit').reduce(
      (s, l) => s + l.Amount,
      0,
    )
    expect(debits).toBeCloseTo(1000)
    expect(debits).toBeCloseTo(credits)
  })

  it('omite líneas de cuentas no mapeadas', () => {
    const totals = sumTotals([item])
    const je = buildJournalEntry(totals, { wageExpense: '1', cash: '2' }, '2026-05-31')
    // Solo débito gasto + crédito cash (las liabilities sin cuenta se omiten).
    expect(je.Line).toHaveLength(2)
  })

  it('isMappingComplete exige las cuentas mínimas', () => {
    expect(isMappingComplete(fullMapping)).toBe(true)
    expect(isMappingComplete({ wageExpense: '1' })).toBe(false)
  })
})

describe('QuickBooks IIF/CSV export', () => {
  it('el IIF balancea (TRNS + suma de SPL = 0)', () => {
    const totals = sumTotals([item])
    const iif = buildIif(totals, '05/31/2026')
    const lines = iif.trim().split('\n')
    const trns = lines.find((l) => l.startsWith('TRNS\t'))!
    const spls = lines.filter((l) => l.startsWith('SPL\t'))
    const trnsAmount = parseFloat(trns.split('\t')[4])
    const splSum = spls.reduce((s, l) => s + parseFloat(l.split('\t')[4]), 0)
    expect(trnsAmount + splSum).toBeCloseTo(0)
    expect(trnsAmount).toBeCloseTo(1000)
  })

  it('el CSV tiene cabecera + filas', () => {
    const csv = buildCsv(sumTotals([item]))
    expect(csv.split('\n')[0]).toBe('Account,Debit,Credit,Memo')
    expect(csv).toContain('1000.00')
  })
})
