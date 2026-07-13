// =============================================================================
// MyJova — US Federal payroll tax calculations (2026)
// =============================================================================
// Implementa el "percentage method" de IRS Publication 15-T para 2026.
//
// IMPORTANTE: Los brackets y umbrales aquí son aproximados basados en
// proyecciones para 2026. ANTES de pasar a producción, valida contra la
// publicación oficial de IRS Pub 15-T 2026 que se publica en diciembre 2025.
// La estructura del algoritmo NO cambia entre años; solo los umbrales.
// =============================================================================

export type FilingStatus =
  | 'single'
  | 'married_jointly'
  | 'married_separately'
  | 'head_of_household'

// -----------------------------------------------------------------------------
// Brackets 2026 — Percentage Method, Standard (Forms W-4 desde 2020)
// -----------------------------------------------------------------------------
// Estos brackets son ANUALES y se aplican al "adjusted annual wages".
// El standard deduction (proyección 2026 ~$15,000 single, ~$30,000 MFJ) está
// implícitamente reflejado en el primer bracket en cero.

type Bracket = {
  thresholdCents: number       // límite inferior del bracket en cents
  rate: number                  // ej. 0.10 = 10%
  baseTaxCents: number          // impuesto acumulado al inicio del bracket
}

const BRACKETS_SINGLE_2026: Bracket[] = [
  { thresholdCents: 0,         rate: 0.00, baseTaxCents: 0 },
  { thresholdCents: 1500000,   rate: 0.10, baseTaxCents: 0 },
  { thresholdCents: 2670000,   rate: 0.12, baseTaxCents: 117000 },
  { thresholdCents: 6250000,   rate: 0.22, baseTaxCents: 546600 },
  { thresholdCents: 11825000,  rate: 0.24, baseTaxCents: 1773100 },
  { thresholdCents: 21212500,  rate: 0.32, baseTaxCents: 4026100 },
  { thresholdCents: 26562500,  rate: 0.35, baseTaxCents: 5738100 },
  { thresholdCents: 64150000,  rate: 0.37, baseTaxCents: 18893700 },
]

const BRACKETS_MFJ_2026: Bracket[] = [
  { thresholdCents: 0,         rate: 0.00, baseTaxCents: 0 },
  { thresholdCents: 3000000,   rate: 0.10, baseTaxCents: 0 },
  { thresholdCents: 5340000,   rate: 0.12, baseTaxCents: 234000 },
  { thresholdCents: 12500000,  rate: 0.22, baseTaxCents: 1093200 },
  { thresholdCents: 23650000,  rate: 0.24, baseTaxCents: 3546200 },
  { thresholdCents: 42425000,  rate: 0.32, baseTaxCents: 8052200 },
  { thresholdCents: 53125000,  rate: 0.35, baseTaxCents: 11476200 },
  { thresholdCents: 78200000,  rate: 0.37, baseTaxCents: 20252450 },
]

function getBrackets(filingStatus: FilingStatus): Bracket[] {
  switch (filingStatus) {
    case 'married_jointly':
      return BRACKETS_MFJ_2026
    case 'single':
    case 'married_separately':
    case 'head_of_household':
    default:
      return BRACKETS_SINGLE_2026
  }
}

// -----------------------------------------------------------------------------
// FICA constants 2026 (proyección)
// -----------------------------------------------------------------------------
const SOCIAL_SECURITY_RATE = 0.062
const SOCIAL_SECURITY_WAGE_BASE_CENTS = 18300000  // ~$183,000 (proyección 2026, validar)
const MEDICARE_RATE = 0.0145
const MEDICARE_ADDITIONAL_RATE = 0.009
const MEDICARE_ADDITIONAL_THRESHOLD_CENTS = 20000000  // $200,000 (no cambia con inflación por estatuto)
const FUTA_RATE = 0.006   // 0.6% efectivo después de credit (6% bruto - 5.4%)
const FUTA_WAGE_BASE_CENTS = 700000  // $7,000 — fijo

// -----------------------------------------------------------------------------
// 1) Federal withholding (income tax)
// -----------------------------------------------------------------------------
export function calcUSFederalWithholding(args: {
  grossCents: number          // gross del PERÍODO actual
  periodsPerYear: number      // 12, 24, 26, 52
  filingStatus: FilingStatus
  dependents: number          // W-4 line 3 (count of dependents)
}): number {
  // 1) Anualizar el income del período.
  const annualizedCents = args.grossCents * args.periodsPerYear

  // 2) Reducir por créditos de dependientes. Aproximación: $2,000 por
  //    dependiente menor de 17. En la práctica se distribuye en el W-4
  //    line 3 dollar amount; aquí simplificamos.
  const dependentCreditCents = args.dependents * 200000

  // 3) Calcular tax anualizado por brackets.
  const brackets = getBrackets(args.filingStatus)
  let taxCents = 0
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (annualizedCents >= brackets[i].thresholdCents) {
      const excess = annualizedCents - brackets[i].thresholdCents
      taxCents = brackets[i].baseTaxCents + Math.round(excess * brackets[i].rate)
      break
    }
  }

  // 4) Aplicar créditos.
  taxCents = Math.max(0, taxCents - dependentCreditCents)

  // 5) Dividir entre periodos para llegar al withholding del período.
  const withholding = Math.round(taxCents / args.periodsPerYear)
  return Math.max(0, withholding)
}

// -----------------------------------------------------------------------------
// 2) Social Security (employee portion)
// -----------------------------------------------------------------------------
export function calcUSSocialSecurity(grossCents: number, ytdGrossCents: number): number {
  const remainingCap = Math.max(0, SOCIAL_SECURITY_WAGE_BASE_CENTS - ytdGrossCents)
  const taxableCents = Math.min(grossCents, remainingCap)
  return Math.round(taxableCents * SOCIAL_SECURITY_RATE)
}

// -----------------------------------------------------------------------------
// 3) Medicare (employee — incluye Additional 0.9% sobre $200k)
// -----------------------------------------------------------------------------
export function calcUSMedicare(grossCents: number, ytdGrossCents: number): number {
  // 1.45% sobre todo el income.
  const base = Math.round(grossCents * MEDICARE_RATE)

  // 0.9% adicional sobre la porción de YTD que excede $200,000.
  const newYtd = ytdGrossCents + grossCents
  let additional = 0
  if (newYtd > MEDICARE_ADDITIONAL_THRESHOLD_CENTS) {
    const previousAbove = Math.max(0, ytdGrossCents - MEDICARE_ADDITIONAL_THRESHOLD_CENTS)
    const newAbove = newYtd - MEDICARE_ADDITIONAL_THRESHOLD_CENTS
    const portionThisPeriod = newAbove - previousAbove
    additional = Math.round(portionThisPeriod * MEDICARE_ADDITIONAL_RATE)
  }

  return base + additional
}

// -----------------------------------------------------------------------------
// 4) FUTA (Federal Unemployment Tax — solo employer)
// -----------------------------------------------------------------------------
export function calcUSEmployerFUTA(grossCents: number, ytdGrossCents: number): number {
  const remaining = Math.max(0, FUTA_WAGE_BASE_CENTS - ytdGrossCents)
  const taxable = Math.min(grossCents, remaining)
  return Math.round(taxable * FUTA_RATE)
}
