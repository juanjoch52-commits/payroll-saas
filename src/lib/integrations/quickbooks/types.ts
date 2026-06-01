// Tipos compartidos de la integración QuickBooks Online.

export type QboTokens = {
  accessToken: string
  refreshToken: string
  realmId: string
  expiresAt: number // epoch ms
}

/** IDs de cuentas QBO a las que mapeamos la nómina (configurable por tenant). */
export type AccountMapping = {
  wageExpense?: string
  cash?: string
  federalLiability?: string
  ssLiability?: string
  medicareLiability?: string
  stateLiability?: string
}

export type QboConfig = {
  realmId?: string
  accountMapping?: AccountMapping
  exportMode?: 'journal' | 'bill'
}

/** Totales agregados de una payroll run (en centavos). */
export type PayrollTotals = {
  grossCents: number
  netCents: number
  federalCents: number
  ssCents: number
  medicareCents: number
  stateCents: number
  otherCents: number
}
