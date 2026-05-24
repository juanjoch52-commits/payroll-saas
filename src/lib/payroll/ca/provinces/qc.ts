// Quebec provincial tax + QPP/QPIP 2026 (projection — validate against Revenu Québec TP-1015.F)
type Bracket = { thresholdCents: number; rate: number; baseTaxCents: number }

const QC_BRACKETS: Bracket[] = [
  { thresholdCents: 0, rate: 0.14, baseTaxCents: 0 },
  { thresholdCents: 5340000, rate: 0.19, baseTaxCents: 747600 },
  { thresholdCents: 10680000, rate: 0.24, baseTaxCents: 1762200 },
  { thresholdCents: 12978000, rate: 0.2575, baseTaxCents: 2313720 },
]

const QC_BPA_2026 = 1804900 // $18,049

// QPP 2026
const QPP_MAX_PENSIONABLE_CENTS = 6970000
const QPP_BASIC_EXEMPTION_CENTS = 350000
const QPP_RATE = 0.064

// QPIP (parental insurance) 2026
const QPIP_MAX_INSURABLE_CENTS = 9450000
const QPIP_RATE = 0.00494

export function calcQuebecTax(input: {
  grossCents: number
  periodsPerYear: number
  td1ProvincialCents?: number
}): number {
  if (input.grossCents <= 0) return 0
  const annualWages = input.grossCents * input.periodsPerYear
  const td1 = input.td1ProvincialCents ?? QC_BPA_2026
  const taxableAnnual = Math.max(0, annualWages - td1)

  let bracket = QC_BRACKETS[0]
  for (const b of QC_BRACKETS) {
    if (taxableAnnual >= b.thresholdCents) bracket = b
    else break
  }
  const annualTax = Math.max(
    0,
    Math.round(
      bracket.baseTaxCents +
        (taxableAnnual - bracket.thresholdCents) * bracket.rate -
        Math.round(td1 * 0.14),
    ),
  )
  return Math.round(annualTax / input.periodsPerYear)
}

export function calcQPP(grossCents: number, ytdPensionableCents: number): number {
  const periodPensionable = Math.min(
    grossCents,
    Math.max(0, QPP_MAX_PENSIONABLE_CENTS - ytdPensionableCents),
  )
  if (periodPensionable <= 0) return 0
  const exemption = Math.min(periodPensionable, QPP_BASIC_EXEMPTION_CENTS)
  const contributable = Math.max(0, periodPensionable - exemption)
  return Math.round(contributable * QPP_RATE)
}

export function calcQPIP(grossCents: number, ytdInsurableCents: number): number {
  const periodInsurable = Math.min(
    grossCents,
    Math.max(0, QPIP_MAX_INSURABLE_CENTS - ytdInsurableCents),
  )
  return Math.round(Math.max(0, periodInsurable) * QPIP_RATE)
}
