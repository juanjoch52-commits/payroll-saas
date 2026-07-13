// =============================================================================
// US State withholding registry
// =============================================================================
// Maps state code (e.g. 'CA', 'US-CA') to its calc function.
// New states: implement in their own file, then register here.
// =============================================================================

import type { FilingStatus } from '../federal-2026'
import { calcCaliforniaWithholding } from './california'
import { calcTexasWithholding } from './texas'
import { calcNewYorkWithholding } from './new-york'
import { calcFloridaWithholding } from './florida'
import { calcPennsylvaniaWithholding } from './pennsylvania'
import { calcIllinoisWithholding } from './illinois'

export type StateWithholdingInput = {
  grossCents: number
  periodsPerYear: number
  filingStatus: FilingStatus
  dependents: number
  /**
   * State code. Accepts 'CA', 'US-CA', 'us-ca' — normalized to 2-letter upper.
   * If unknown / not implemented, returns 0 silently (W-2 will show $0 in Box 17).
   */
  stateCode: string
}

function normalize(code: string): string {
  return code.replace(/^us-?/i, '').toUpperCase().trim()
}

export function calcStateWithholding(input: StateWithholdingInput): number {
  const code = normalize(input.stateCode)
  switch (code) {
    case 'CA':
      return calcCaliforniaWithholding(input)
    case 'TX':
      return calcTexasWithholding()
    case 'NY':
      return calcNewYorkWithholding(input)
    case 'FL':
      return calcFloridaWithholding()
    case 'PA':
      return calcPennsylvaniaWithholding(input)
    case 'IL':
      return calcIllinoisWithholding({
        grossCents: input.grossCents,
        periodsPerYear: input.periodsPerYear,
        allowances: input.dependents,
      })
    default:
      return 0
  }
}

/** List of states with implemented withholding (for UI / docs) */
export const SUPPORTED_STATES = ['CA', 'TX', 'NY', 'FL', 'PA', 'IL'] as const
