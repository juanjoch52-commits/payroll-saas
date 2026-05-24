// =============================================================================
// Canada Federal payroll deductions 2026 (projection)
// =============================================================================
// Reference: CRA Publication T4127 — "Payroll Deductions Formulas" 2026.
// Validate against official PDF when released (typically December).
//
// Components:
//   - CPP/QPP (Canada/Quebec Pension Plan)
//   - EI (Employment Insurance) — different rate in Quebec
//   - Federal income tax (5 brackets)
//
// NOTE: Quebec has its own QPP and provincial tax — see provinces/qc.ts.
// =============================================================================

// 2026 federal brackets (annual, projection)
type Bracket = { thresholdCents: number; rate: number; baseTaxCents: number }
const FEDERAL_BRACKETS: Bracket[] = [
  { thresholdCents: 0, rate: 0.15, baseTaxCents: 0 },
  { thresholdCents: 5779700, rate: 0.205, baseTaxCents: 866955 },
  { thresholdCents: 11559500, rate: 0.26, baseTaxCents: 2051867 },
  { thresholdCents: 17935600, rate: 0.29, baseTaxCents: 3709554 },
  { thresholdCents: 25684800, rate: 0.33, baseTaxCents: 5956771 },
]

// Basic personal amount 2026 (proyectado)
const BPA_2026 = 1652900 // $16,529 annual non-refundable credit base

// CPP 2026 (proyectado)
const CPP_MAX_PENSIONABLE_CENTS = 6970000 // $69,700
const CPP_BASIC_EXEMPTION_CENTS = 350000 // $3,500
const CPP_EMPLOYEE_RATE = 0.0595
const CPP2_RATE = 0.04 // CPP2 enhanced

// EI 2026 (proyectado)
const EI_MAX_INSURABLE_CENTS = 6500000 // $65,000
const EI_EMPLOYEE_RATE = 0.0166

export type CAFederalInput = {
  grossCents: number
  periodsPerYear: number
  ytdGrossCents: number
  /** TD1 federal claim amount in cents. If 0, defaults to BPA. */
  td1Cents?: number
  /** Quebec uses QPP instead of CPP — set to true for Quebec residents */
  isQuebec?: boolean
  /** EI Reduction — 0 default */
  eiReduction?: number
}

export function calcCAFederalTax(input: CAFederalInput): number {
  if (input.grossCents <= 0) return 0
  const annualWages = input.grossCents * input.periodsPerYear
  const td1 = input.td1Cents ?? BPA_2026
  const taxableAnnual = Math.max(0, annualWages - td1)

  let bracket = FEDERAL_BRACKETS[0]
  for (const b of FEDERAL_BRACKETS) {
    if (taxableAnnual >= b.thresholdCents) bracket = b
    else break
  }
  const annualTax = Math.max(
    0,
    Math.round(
      bracket.baseTaxCents +
        (taxableAnnual - bracket.thresholdCents) * bracket.rate -
        Math.round(td1 * 0.15),
    ),
  )
  return Math.round(annualTax / input.periodsPerYear)
}

export function calcCPP(grossCents: number, ytdPensionableCents: number, isQuebec = false): number {
  if (isQuebec) return 0 // QPP handled in provinces/qc.ts
  const periodPensionable = Math.min(
    grossCents,
    Math.max(0, CPP_MAX_PENSIONABLE_CENTS - ytdPensionableCents),
  )
  if (periodPensionable <= 0) return 0
  // Subtract basic exemption pro-rated (we approximate per-pay)
  const exemption = Math.min(periodPensionable, CPP_BASIC_EXEMPTION_CENTS)
  const contributable = Math.max(0, periodPensionable - exemption)
  return Math.round(contributable * CPP_EMPLOYEE_RATE)
}

export function calcEI(grossCents: number, ytdInsurableCents: number, isQuebec = false): number {
  const rate = isQuebec ? EI_EMPLOYEE_RATE * 0.79 : EI_EMPLOYEE_RATE // Quebec residents pay reduced federal EI
  const periodInsurable = Math.min(
    grossCents,
    Math.max(0, EI_MAX_INSURABLE_CENTS - ytdInsurableCents),
  )
  return Math.round(Math.max(0, periodInsurable) * rate)
}

/** Helper for components display */
export function ca2026Constants() {
  return {
    cppMax: CPP_MAX_PENSIONABLE_CENTS,
    cppExemption: CPP_BASIC_EXEMPTION_CENTS,
    cppRate: CPP_EMPLOYEE_RATE,
    cpp2Rate: CPP2_RATE,
    eiMax: EI_MAX_INSURABLE_CENTS,
    eiRate: EI_EMPLOYEE_RATE,
    bpa: BPA_2026,
  }
}
