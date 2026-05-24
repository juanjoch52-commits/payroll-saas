// =============================================================================
// Pennsylvania — flat 3.07% state income tax
// =============================================================================
// Plus local Earned Income Tax (EIT) that varies by municipality (typically
// 1% but can be 0% to 3.928% in Philadelphia). Local handling is out of scope
// for this MVP — we only apply the state flat rate.
// =============================================================================

const PA_FLAT_RATE = 0.0307

export function calcPennsylvaniaWithholding(input: { grossCents: number }): number {
  return Math.round(input.grossCents * PA_FLAT_RATE)
}

export const PENNSYLVANIA_SUTA_RATE = 0.0309
export const PENNSYLVANIA_SUTA_WAGE_BASE_CENTS = 1050000 // $10,500
