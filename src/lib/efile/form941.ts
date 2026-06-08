// =============================================================================
// IRS Form 941 — Employer's Quarterly Federal Tax Return (cálculo del worksheet)
// =============================================================================
// Cálculo PURO de las líneas clave del 941 a partir de los totales agregados del
// trimestre. No genera el PDF oficial ni transmite — produce las cifras para
// rellenar el formulario (o para conciliar con los depósitos).
//
// Tasas combinadas (empleado + empleador):
//   Social Security: 12.4% (6.2% × 2)
//   Medicare:         2.9% (1.45% × 2)  [+ 0.9% additional ya viene en line 5d]
// =============================================================================

export const SS_RATE_941 = 0.124
export const MEDICARE_RATE_941 = 0.029

export type Form941Input = {
  year: number
  quarter: 1 | 2 | 3 | 4
  employeeCount: number
  wagesCents: number // line 2 — wages, tips, other comp
  federalWithheldCents: number // line 3 — federal income tax withheld
  socialSecurityWagesCents: number // line 5a
  socialSecurityTipsCents?: number // line 5b
  medicareWagesCents: number // line 5c
  additionalMedicareCents?: number // line 5d — Additional Medicare 0.9% ya calculado
}

export type Form941Lines = {
  year: number
  quarter: 1 | 2 | 3 | 4
  line1EmployeeCount: number
  line2WagesCents: number
  line3FederalWithheldCents: number
  line5aSsWagesCents: number
  line5aTaxCents: number
  line5bSsTipsCents: number
  line5bTaxCents: number
  line5cMedicareWagesCents: number
  line5cTaxCents: number
  line5dAdditionalMedicareCents: number
  line5eTotalTaxCents: number
  line6TotalCents: number
  line12TotalCents: number
}

export function computeForm941(input: Form941Input): Form941Lines {
  const ssTips = input.socialSecurityTipsCents ?? 0
  const addlMedicare = input.additionalMedicareCents ?? 0

  const line5aTaxCents = Math.round(input.socialSecurityWagesCents * SS_RATE_941)
  const line5bTaxCents = Math.round(ssTips * SS_RATE_941)
  const line5cTaxCents = Math.round(input.medicareWagesCents * MEDICARE_RATE_941)

  const line5eTotalTaxCents = line5aTaxCents + line5bTaxCents + line5cTaxCents + addlMedicare
  const line6TotalCents = input.federalWithheldCents + line5eTotalTaxCents

  return {
    year: input.year,
    quarter: input.quarter,
    line1EmployeeCount: input.employeeCount,
    line2WagesCents: input.wagesCents,
    line3FederalWithheldCents: input.federalWithheldCents,
    line5aSsWagesCents: input.socialSecurityWagesCents,
    line5aTaxCents,
    line5bSsTipsCents: ssTips,
    line5bTaxCents,
    line5cMedicareWagesCents: input.medicareWagesCents,
    line5cTaxCents,
    line5dAdditionalMedicareCents: addlMedicare,
    line5eTotalTaxCents,
    line6TotalCents,
    line12TotalCents: line6TotalCents, // sin ajustes (line 7-11 = 0) en este worksheet
  }
}

/** Devuelve el rango de fechas [start, end] (YYYY-MM-DD) de un trimestre. */
export function quarterDateRange(year: number, quarter: 1 | 2 | 3 | 4): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = startMonth + 2
  const lastDay = new Date(year, endMonth, 0).getDate() // día 0 del mes siguiente
  const mm = (m: number) => String(m).padStart(2, '0')
  return { start: `${year}-${mm(startMonth)}-01`, end: `${year}-${mm(endMonth)}-${lastDay}` }
}
