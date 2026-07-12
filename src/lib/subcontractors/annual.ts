// =============================================================================
// Reporte anual de ingresos del contratista (puro, testeable)
// =============================================================================
// Agrega los settlement_records CONGELADOS por año fiscal. La atribución de
// año es por PAY DATE (base caja: el año en que se cobró el cheque — lo que
// un contador espera para ingresos). Ingresos = facturado (+HST cobrado);
// gastos = lo pagado a su equipo; margen = ingresos − gastos (pre-HST).
// =============================================================================

export type SettlementRecordRow = {
  payroll_run_id: string
  subcontractor_id: string
  period_start: string
  period_end: string
  pay_date: string
  subtotal_cents: number
  tax_pct: number
  tax_cents: number
  total_cents: number
  pay_total_cents: number
  margin_cents: number
}

export type AnnualSummary = {
  year: number
  runs: number
  /** Ingresos facturados (sin HST). */
  subtotalCents: number
  /** HST/GST cobrado (se remite al fisco, no es ingreso neto). */
  taxCents: number
  /** Total de cheques recibidos (subtotal + HST). */
  totalCents: number
  /** Gastos: lo pagado a su equipo. */
  payTotalCents: number
  /** Margen del año (subtotal − pagado). */
  marginCents: number
}

export function yearOf(record: Pick<SettlementRecordRow, 'pay_date'>): number {
  return Number(record.pay_date.slice(0, 4))
}

/** Años con actividad, descendente (para el selector). */
export function yearsAvailable(records: Pick<SettlementRecordRow, 'pay_date'>[]): number[] {
  return [...new Set(records.map(yearOf))].sort((a, b) => b - a)
}

/** Suma los registros de UN contratista para un año (por pay date). */
export function annualSummary(records: SettlementRecordRow[], year: number): AnnualSummary {
  const inYear = records.filter((r) => yearOf(r) === year)
  const sum = (f: (r: SettlementRecordRow) => number) => inYear.reduce((a, r) => a + f(r), 0)
  return {
    year,
    runs: inYear.length,
    subtotalCents: sum((r) => r.subtotal_cents),
    taxCents: sum((r) => r.tax_cents),
    totalCents: sum((r) => r.total_cents),
    payTotalCents: sum((r) => r.pay_total_cents),
    marginCents: sum((r) => r.margin_cents),
  }
}

/** CSV del año (una fila por run + fila TOTAL) — para el contador. */
export function annualCsv(
  rootName: string,
  records: SettlementRecordRow[],
  year: number,
): string {
  const money = (c: number) => (c / 100).toFixed(2)
  const inYear = records
    .filter((r) => yearOf(r) === year)
    .sort((a, b) => (a.pay_date < b.pay_date ? -1 : 1))
  const s = annualSummary(records, year)

  const rows = [
    ['Contractor', rootName],
    ['Year', String(year)],
    [],
    ['Pay date', 'Period start', 'Period end', 'Billed subtotal', 'HST', 'Check total', 'Paid to crew', 'Margin'],
    ...inYear.map((r) => [
      r.pay_date,
      r.period_start,
      r.period_end,
      money(r.subtotal_cents),
      money(r.tax_cents),
      money(r.total_cents),
      money(r.pay_total_cents),
      money(r.margin_cents),
    ]),
    [],
    ['TOTAL', '', '', money(s.subtotalCents), money(s.taxCents), money(s.totalCents), money(s.payTotalCents), money(s.marginCents)],
  ]
  return rows.map((r) => (r as string[]).map(csvCell).join(',')).join('\r\n')
}

function csvCell(v: string | undefined): string {
  const s = v ?? ''
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
