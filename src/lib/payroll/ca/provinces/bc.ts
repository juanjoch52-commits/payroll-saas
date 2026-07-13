// British Columbia provincial tax 2026 (projection)
type Bracket = { thresholdCents: number; rate: number; baseTaxCents: number }

const BC_BRACKETS: Bracket[] = [
  { thresholdCents: 0, rate: 0.0506, baseTaxCents: 0 },
  { thresholdCents: 4805900, rate: 0.077, baseTaxCents: 243178 },
  { thresholdCents: 9609100, rate: 0.105, baseTaxCents: 612997 },
  { thresholdCents: 11030400, rate: 0.1229, baseTaxCents: 762234 },
  { thresholdCents: 13393900, rate: 0.147, baseTaxCents: 1052646 },
  { thresholdCents: 18197200, rate: 0.168, baseTaxCents: 1758716 },
  { thresholdCents: 25380900, rate: 0.205, baseTaxCents: 2965593 },
]

const BC_BPA_2026 = 1242800

export function calcBritishColumbiaTax(input: {
  grossCents: number
  periodsPerYear: number
  td1ProvincialCents?: number
}): number {
  if (input.grossCents <= 0) return 0
  const annualWages = input.grossCents * input.periodsPerYear
  const td1 = input.td1ProvincialCents ?? BC_BPA_2026
  const taxableAnnual = Math.max(0, annualWages - td1)
  let bracket = BC_BRACKETS[0]
  for (const b of BC_BRACKETS) {
    if (taxableAnnual >= b.thresholdCents) bracket = b
    else break
  }
  const annualTax = Math.max(
    0,
    Math.round(
      bracket.baseTaxCents +
        (taxableAnnual - bracket.thresholdCents) * bracket.rate -
        Math.round(td1 * 0.0506),
    ),
  )
  return Math.round(annualTax / input.periodsPerYear)
}
