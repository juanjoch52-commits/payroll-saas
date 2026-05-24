// Ontario provincial tax 2026 (projection — validate against CRA T4127 ON tables)
type Bracket = { thresholdCents: number; rate: number; baseTaxCents: number }

const ON_BRACKETS: Bracket[] = [
  { thresholdCents: 0, rate: 0.0505, baseTaxCents: 0 },
  { thresholdCents: 5320500, rate: 0.0915, baseTaxCents: 268712 },
  { thresholdCents: 10641000, rate: 0.1116, baseTaxCents: 755527 },
  { thresholdCents: 15000000, rate: 0.1216, baseTaxCents: 1241906 },
  { thresholdCents: 22000000, rate: 0.1316, baseTaxCents: 2095106 },
]

const ON_BPA_2026 = 1276700 // $12,767

export function calcOntarioTax(input: {
  grossCents: number
  periodsPerYear: number
  td1ProvincialCents?: number
}): number {
  if (input.grossCents <= 0) return 0
  const annualWages = input.grossCents * input.periodsPerYear
  const td1 = input.td1ProvincialCents ?? ON_BPA_2026
  const taxableAnnual = Math.max(0, annualWages - td1)

  let bracket = ON_BRACKETS[0]
  for (const b of ON_BRACKETS) {
    if (taxableAnnual >= b.thresholdCents) bracket = b
    else break
  }
  const annualTax = Math.max(
    0,
    Math.round(
      bracket.baseTaxCents +
        (taxableAnnual - bracket.thresholdCents) * bracket.rate -
        Math.round(td1 * 0.0505),
    ),
  )
  return Math.round(annualTax / input.periodsPerYear)
}
