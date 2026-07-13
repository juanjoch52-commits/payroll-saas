// Illinois — flat 4.95% state income tax with personal exemption
// IL-W-4: Personal exemption $2,775 (proyección 2026) per dependent (including self).
const IL_FLAT_RATE = 0.0495
const IL_EXEMPTION_PER_ALLOWANCE = 277500 // $2,775 annual

export function calcIllinoisWithholding(input: {
  grossCents: number
  periodsPerYear: number
  /** Number of allowances claimed on IL-W-4 (similar to W-4 but separate form) */
  allowances: number
}): number {
  if (input.grossCents <= 0) return 0
  const annualWages = input.grossCents * input.periodsPerYear
  const exemption = (input.allowances + 1) * IL_EXEMPTION_PER_ALLOWANCE // +1 for self
  const taxable = Math.max(0, annualWages - exemption)
  const annualTax = Math.round(taxable * IL_FLAT_RATE)
  return Math.round(annualTax / input.periodsPerYear)
}

export const ILLINOIS_SUTA_RATE = 0.034
export const ILLINOIS_SUTA_WAGE_BASE_CENTS = 1370000 // $13,700
