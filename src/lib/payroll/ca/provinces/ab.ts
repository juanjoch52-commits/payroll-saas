// Alberta provincial tax 2026 (projection)
type Bracket = { thresholdCents: number; rate: number; baseTaxCents: number }

const AB_BRACKETS: Bracket[] = [
  { thresholdCents: 0, rate: 0.10, baseTaxCents: 0 },
  { thresholdCents: 14854700, rate: 0.12, baseTaxCents: 1485470 },
  { thresholdCents: 17774400, rate: 0.13, baseTaxCents: 1835834 },
  { thresholdCents: 23698900, rate: 0.14, baseTaxCents: 2606060 },
  { thresholdCents: 35548400, rate: 0.15, baseTaxCents: 4264994 },
]

const AB_BPA_2026 = 2238500

export function calcAlbertaTax(input: {
  grossCents: number
  periodsPerYear: number
  td1ProvincialCents?: number
}): number {
  if (input.grossCents <= 0) return 0
  const annualWages = input.grossCents * input.periodsPerYear
  const td1 = input.td1ProvincialCents ?? AB_BPA_2026
  const taxableAnnual = Math.max(0, annualWages - td1)
  let bracket = AB_BRACKETS[0]
  for (const b of AB_BRACKETS) {
    if (taxableAnnual >= b.thresholdCents) bracket = b
    else break
  }
  const annualTax = Math.max(
    0,
    Math.round(
      bracket.baseTaxCents +
        (taxableAnnual - bracket.thresholdCents) * bracket.rate -
        Math.round(td1 * 0.1),
    ),
  )
  return Math.round(annualTax / input.periodsPerYear)
}
