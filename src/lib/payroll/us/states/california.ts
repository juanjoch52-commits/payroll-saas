// =============================================================================
// California state withholding — Method B (Exact Calculation) 2026
// =============================================================================
// Reference: EDD Publication DE 44 (proyectado 2026). Validar contra el PDF
// oficial cuando se publique (típicamente en otoño 2025).
//
// CA usa "Standard Deduction" + "Exemption Allowance" + brackets propios.
// Aquí implementamos el Method B (más preciso que A) para Single + MFJ.
// =============================================================================

import type { FilingStatus } from '../federal-2026'

type Bracket = { thresholdCents: number; rate: number; baseTaxCents: number }

// Brackets ANUALES 2026 — proyección razonable (CA actualiza inflation-adjusted)
const BRACKETS_SINGLE: Bracket[] = [
  { thresholdCents: 0, rate: 0.011, baseTaxCents: 0 },
  { thresholdCents: 1077500, rate: 0.022, baseTaxCents: 11853 },
  { thresholdCents: 2554500, rate: 0.044, baseTaxCents: 44347 },
  { thresholdCents: 4031000, rate: 0.066, baseTaxCents: 109345 },
  { thresholdCents: 5594900, rate: 0.088, baseTaxCents: 212562 },
  { thresholdCents: 7080900, rate: 0.1023, baseTaxCents: 343331 },
  { thresholdCents: 36157400, rate: 0.1133, baseTaxCents: 3318588 },
  { thresholdCents: 43388900, rate: 0.1243, baseTaxCents: 4138156 },
  { thresholdCents: 72314800, rate: 0.1353, baseTaxCents: 7733869 },
  { thresholdCents: 100000000, rate: 0.143, baseTaxCents: 11479886 },
]

const BRACKETS_MFJ: Bracket[] = BRACKETS_SINGLE.map((b) => ({
  ...b,
  thresholdCents: b.thresholdCents * 2,
  baseTaxCents: b.baseTaxCents * 2,
}))

// Standard deduction 2026 estimate
const STD_DEDUCTION_SINGLE = 562500 // $5,625
const STD_DEDUCTION_MFJ = 1125000   // $11,250
// Exemption allowance per dependent 2026 estimate
const EXEMPTION_PER_DEPENDENT = 16100 // $161

export function calcCaliforniaWithholding(input: {
  grossCents: number
  periodsPerYear: number
  filingStatus: FilingStatus
  dependents: number
}): number {
  if (input.grossCents <= 0) return 0

  // Step 1: annualize wages
  const annualWages = input.grossCents * input.periodsPerYear

  // Step 2: subtract standard deduction
  const isJoint = input.filingStatus === 'married_jointly'
  const stdDeduction = isJoint ? STD_DEDUCTION_MFJ : STD_DEDUCTION_SINGLE
  const taxableAnnual = Math.max(0, annualWages - stdDeduction)

  // Step 3: compute tax from brackets
  const brackets = isJoint ? BRACKETS_MFJ : BRACKETS_SINGLE
  let bracket = brackets[0]
  for (const b of brackets) {
    if (taxableAnnual >= b.thresholdCents) bracket = b
    else break
  }
  const annualTaxBeforeExemptions = Math.round(
    bracket.baseTaxCents + (taxableAnnual - bracket.thresholdCents) * bracket.rate,
  )

  // Step 4: subtract exemption credits
  const exemptionCredit = input.dependents * EXEMPTION_PER_DEPENDENT
  const annualTax = Math.max(0, annualTaxBeforeExemptions - exemptionCredit)

  // Step 5: deannualize back to pay period
  return Math.round(annualTax / input.periodsPerYear)
}
