// =============================================================================
// New York state withholding — Method I (Exact Calculation) 2026
// =============================================================================
// Reference: NYS-50-T-NYS (proyectado). Validar contra Publication.
// NY tiene "Supplemental Tax" además del income tax.
// =============================================================================

import type { FilingStatus } from '../federal-2026'

type Bracket = { thresholdCents: number; rate: number; baseTaxCents: number }

// 2026 NY State income tax brackets (proyectados)
const BRACKETS_SINGLE: Bracket[] = [
  { thresholdCents: 0, rate: 0.04, baseTaxCents: 0 },
  { thresholdCents: 850000, rate: 0.045, baseTaxCents: 34000 },
  { thresholdCents: 1170000, rate: 0.0525, baseTaxCents: 48400 },
  { thresholdCents: 1390000, rate: 0.055, baseTaxCents: 59950 },
  { thresholdCents: 8060000, rate: 0.06, baseTaxCents: 426800 },
  { thresholdCents: 21580000, rate: 0.0685, baseTaxCents: 1237800 },
  { thresholdCents: 107700000, rate: 0.0965, baseTaxCents: 7137120 },
  { thresholdCents: 540900000, rate: 0.103, baseTaxCents: 48954000 },
  { thresholdCents: 1623100000, rate: 0.1085, baseTaxCents: 160490700 },
  { thresholdCents: 2705300000, rate: 0.109, baseTaxCents: 277902800 },
]

const BRACKETS_MFJ: Bracket[] = BRACKETS_SINGLE.map((b) => ({
  ...b,
  thresholdCents: Math.round(b.thresholdCents * 1.5),
  baseTaxCents: Math.round(b.baseTaxCents * 1.5),
}))

const STD_DEDUCTION_SINGLE = 800000 // $8,000
const STD_DEDUCTION_MFJ = 1605000 // $16,050
const EXEMPTION_PER_DEPENDENT = 100000 // $1,000

export function calcNewYorkWithholding(input: {
  grossCents: number
  periodsPerYear: number
  filingStatus: FilingStatus
  dependents: number
}): number {
  if (input.grossCents <= 0) return 0

  const annualWages = input.grossCents * input.periodsPerYear
  const isJoint = input.filingStatus === 'married_jointly'
  const stdDeduction = isJoint ? STD_DEDUCTION_MFJ : STD_DEDUCTION_SINGLE
  const exemptions = input.dependents * EXEMPTION_PER_DEPENDENT
  const taxableAnnual = Math.max(0, annualWages - stdDeduction - exemptions)

  const brackets = isJoint ? BRACKETS_MFJ : BRACKETS_SINGLE
  let bracket = brackets[0]
  for (const b of brackets) {
    if (taxableAnnual >= b.thresholdCents) bracket = b
    else break
  }
  const annualTax = Math.round(
    bracket.baseTaxCents + (taxableAnnual - bracket.thresholdCents) * bracket.rate,
  )

  return Math.round(annualTax / input.periodsPerYear)
}
