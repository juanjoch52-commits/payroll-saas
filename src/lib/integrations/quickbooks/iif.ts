import type { PayrollTotals } from './types'

// =============================================================================
// Export de archivos para importar manualmente en QuickBooks (sin OAuth).
//   - IIF (Intuit Interchange Format): asiento de diario tab-delimitado.
//   - CSV: tabla simple Account/Debit/Credit/Memo.
// Estas funciones son PURAS (sin I/O) — se prueban fácil y funcionan sin keys.
// =============================================================================

const dollars = (cents: number) => (cents / 100).toFixed(2)

// Nombres de cuenta por defecto (el usuario los renombra en QuickBooks si hace falta).
export const DEFAULT_ACCOUNTS = {
  wage: 'Payroll Expenses',
  cash: 'Checking',
  federal: 'Federal Taxes Payable',
  ss: 'Social Security Payable',
  medicare: 'Medicare Payable',
  state: 'State Taxes Payable',
}

/** Asiento de diario en formato IIF (un TRNS + varios SPL). Débito +, crédito −. */
export function buildIif(totals: PayrollTotals, dateMMDDYYYY: string, memo = 'MyJova payroll'): string {
  const rows: string[] = []
  rows.push(['!TRNS', 'TRNSTYPE', 'DATE', 'ACCNT', 'AMOUNT', 'MEMO'].join('\t'))
  rows.push(['!SPL', 'TRNSTYPE', 'DATE', 'ACCNT', 'AMOUNT', 'MEMO'].join('\t'))
  rows.push('!ENDTRNS')
  rows.push(
    ['TRNS', 'GENERAL JOURNAL', dateMMDDYYYY, DEFAULT_ACCOUNTS.wage, dollars(totals.grossCents), memo].join('\t'),
  )
  const spl = (acct: string, cents: number, m: string) => {
    if (cents > 0) {
      rows.push(['SPL', 'GENERAL JOURNAL', dateMMDDYYYY, acct, '-' + dollars(cents), m].join('\t'))
    }
  }
  spl(DEFAULT_ACCOUNTS.cash, totals.netCents, 'Net pay')
  spl(DEFAULT_ACCOUNTS.federal, totals.federalCents, 'Federal withheld')
  spl(DEFAULT_ACCOUNTS.ss, totals.ssCents, 'Social Security')
  spl(DEFAULT_ACCOUNTS.medicare, totals.medicareCents, 'Medicare')
  spl(DEFAULT_ACCOUNTS.state, totals.stateCents, 'State withheld')
  rows.push('ENDTRNS')
  return rows.join('\n') + '\n'
}

/** Mismo asiento como CSV plano. */
export function buildCsv(totals: PayrollTotals): string {
  const rows = [['Account', 'Debit', 'Credit', 'Memo'].join(',')]
  rows.push([DEFAULT_ACCOUNTS.wage, dollars(totals.grossCents), '', 'Gross wages'].join(','))
  const credit = (acct: string, cents: number, memo: string) => {
    if (cents > 0) rows.push([acct, '', dollars(cents), memo].join(','))
  }
  credit(DEFAULT_ACCOUNTS.cash, totals.netCents, 'Net pay')
  credit(DEFAULT_ACCOUNTS.federal, totals.federalCents, 'Federal withheld')
  credit(DEFAULT_ACCOUNTS.ss, totals.ssCents, 'Social Security')
  credit(DEFAULT_ACCOUNTS.medicare, totals.medicareCents, 'Medicare')
  credit(DEFAULT_ACCOUNTS.state, totals.stateCents, 'State withheld')
  return rows.join('\n') + '\n'
}
