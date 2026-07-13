// =============================================================================
// Acumulación de PTO — puro (testeable)
// =============================================================================
// Cuánto PTO (en horas) acumula un empleado en UN período de nómina:
//   - 'none'             → 0
//   - 'hours_per_period' → accrualRate horas por período, tal cual.
//   - 'days_per_year'    → accrualRate días/año × 8h ÷ periodsPerYear.
// El resultado se suma al saldo con tope opcional maxBalanceHours.
// =============================================================================

export type AccrualMethod = 'none' | 'hours_per_period' | 'days_per_year'

export function accrualForPeriod(
  method: AccrualMethod,
  accrualRate: number,
  periodsPerYear: number,
): number {
  if (!Number.isFinite(accrualRate) || accrualRate <= 0) return 0
  if (method === 'hours_per_period') return round2(accrualRate)
  if (method === 'days_per_year') {
    if (!Number.isFinite(periodsPerYear) || periodsPerYear <= 0) return 0
    return round2((accrualRate * 8) / periodsPerYear)
  }
  return 0
}

/** Nuevo saldo tras acumular, con tope opcional (null/undefined = sin tope). */
export function applyAccrual(
  currentHours: number,
  accruedHours: number,
  maxBalanceHours?: number | null,
): number {
  const next = round2((Number(currentHours) || 0) + accruedHours)
  if (maxBalanceHours != null && Number.isFinite(maxBalanceHours)) {
    return Math.min(next, maxBalanceHours)
  }
  return next
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
