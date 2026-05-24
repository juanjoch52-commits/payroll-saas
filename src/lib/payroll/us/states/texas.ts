// =============================================================================
// Texas state withholding — NONE
// =============================================================================
// Texas has no state income tax. SUTA (unemployment) and other employer-side
// taxes are handled separately. This file exists for registry completeness.
// =============================================================================

export function calcTexasWithholding(): number {
  return 0
}

// SUTA rate 2026 (proyectado, new employer default)
export const TEXAS_SUTA_RATE = 0.0265
export const TEXAS_SUTA_WAGE_BASE_CENTS = 900000 // $9,000
