import type { AccountMapping, PayrollTotals } from './types'

// Convierte centavos → dólares (QBO usa importes decimales).
const toDollars = (cents: number) => Math.round(cents) / 100

export type PayrollItemTotals = {
  gross_cents: number
  net_cents: number
  federal_tax_cents: number
  social_security_cents: number
  medicare_cents: number
  state_tax_cents: number
  other_deductions_cents: number
}

/** Suma los items de una run en totales agregados. */
export function sumTotals(items: PayrollItemTotals[]): PayrollTotals {
  return items.reduce<PayrollTotals>(
    (acc, it) => ({
      grossCents: acc.grossCents + (it.gross_cents ?? 0),
      netCents: acc.netCents + (it.net_cents ?? 0),
      federalCents: acc.federalCents + (it.federal_tax_cents ?? 0),
      ssCents: acc.ssCents + (it.social_security_cents ?? 0),
      medicareCents: acc.medicareCents + (it.medicare_cents ?? 0),
      stateCents: acc.stateCents + (it.state_tax_cents ?? 0),
      otherCents: acc.otherCents + (it.other_deductions_cents ?? 0),
    }),
    { grossCents: 0, netCents: 0, federalCents: 0, ssCents: 0, medicareCents: 0, stateCents: 0, otherCents: 0 },
  )
}

type JeLine = {
  Amount: number
  DetailType: 'JournalEntryLineDetail'
  Description?: string
  JournalEntryLineDetail: { PostingType: 'Debit' | 'Credit'; AccountRef: { value: string } }
}

/**
 * Construye un JournalEntry de QBO desde los totales:
 *   Débito  Wage Expense = gross
 *   Crédito Cash         = net
 *   Crédito *Liability   = impuestos retenidos (federal/SS/medicare/state)
 * Balancea porque gross = net + federal + ss + medicare + state (+ otras
 * deducciones, que en el motor actual son 0).
 */
export function buildJournalEntry(
  totals: PayrollTotals,
  mapping: AccountMapping,
  txnDate: string,
): { Line: JeLine[]; TxnDate: string } {
  const lines: JeLine[] = []
  const add = (
    amountCents: number,
    posting: 'Debit' | 'Credit',
    account: string | undefined,
    desc: string,
  ) => {
    if (!account || amountCents <= 0) return
    lines.push({
      Amount: toDollars(amountCents),
      DetailType: 'JournalEntryLineDetail',
      Description: desc,
      JournalEntryLineDetail: { PostingType: posting, AccountRef: { value: account } },
    })
  }
  add(totals.grossCents, 'Debit', mapping.wageExpense, 'Gross wages')
  add(totals.netCents, 'Credit', mapping.cash, 'Net pay')
  add(totals.federalCents, 'Credit', mapping.federalLiability, 'Federal tax withheld')
  add(totals.ssCents, 'Credit', mapping.ssLiability, 'Social Security withheld')
  add(totals.medicareCents, 'Credit', mapping.medicareLiability, 'Medicare withheld')
  add(totals.stateCents, 'Credit', mapping.stateLiability, 'State tax withheld')
  return { Line: lines, TxnDate: txnDate }
}

/** Las cuentas mínimas necesarias para postear el asiento. */
export function isMappingComplete(mapping: AccountMapping): boolean {
  return Boolean(
    mapping.wageExpense &&
      mapping.cash &&
      mapping.federalLiability &&
      mapping.ssLiability &&
      mapping.medicareLiability,
  )
}

export const ACCOUNT_KEYS: (keyof AccountMapping)[] = [
  'wageExpense',
  'cash',
  'federalLiability',
  'ssLiability',
  'medicareLiability',
  'stateLiability',
]
