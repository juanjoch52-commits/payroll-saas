/**
 * IRS FIRE (Filing Information Returns Electronically) stub.
 *
 * Producing a valid Publication 1220 fixed-width TXT file requires registration
 * with IRS for a Transmitter Control Code (TCC) and a 5-character TCC code.
 * For most small SaaS, using Track1099 / Greenshades / etc is far simpler.
 *
 * This module exposes a buildPub1220Records() that builds the record skeleton
 * (T transmitter, A payer, B payee, C end-of-payer, F end-of-transmission) so
 * the data structure is right, but actual transmission is intentionally a TODO
 * — uploading to FIRE requires SFTP or browser-based file upload to fire.irs.gov.
 */
import type { EfilingResult } from './types'

const TCC = process.env.IRS_FIRE_TCC || ''

export type Pub1220Payee = {
  taxYear: number
  recipientTin: string // 9 digits, no dashes
  paymentAmount: number // dollars (will be converted to integer cents per IRS spec)
  recipientName: string
  recipientAddress: string
  recipientCity: string
  recipientState: string
  recipientZip: string
}

export type Pub1220Input = {
  taxYear: number
  payer: {
    name: string
    ein: string // 9 digits, no dashes
    address: string
    city: string
    state: string
    zip: string
  }
  payees: Pub1220Payee[]
}

/**
 * Builds the Pub 1220 TXT body. Returns the file content as a string so the
 * caller can store it in Supabase Storage and instruct the user to upload it
 * to FIRE manually until SFTP integration is built.
 */
export function buildPub1220Records(input: Pub1220Input): string {
  if (!TCC) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[irs-fire] IRS_FIRE_TCC not set — building stub Pub 1220 with placeholder TCC')
    }
  }

  const tcc = TCC || 'XXXXX'
  const lines: string[] = []

  // Transmitter "T" record (250 chars in real spec — placeholder simplified)
  lines.push(`T${input.taxYear}${tcc}MYJOVA-${Date.now()}`)

  // Payer "A" record
  lines.push(
    `A${input.taxYear}${input.payer.ein}${input.payer.name.slice(0, 40).padEnd(40)}NEC`,
  )

  // Payee "B" records — one per payee
  input.payees.forEach((p) => {
    const amount = String(Math.round(p.paymentAmount * 100)).padStart(12, '0')
    lines.push(
      `B${input.taxYear}${p.recipientTin}${amount}${p.recipientName.slice(0, 40).padEnd(40)}${p.recipientAddress.slice(0, 40).padEnd(40)}${p.recipientCity.slice(0, 40).padEnd(40)}${p.recipientState}${p.recipientZip.slice(0, 9).padEnd(9)}`,
    )
  })

  // End-of-payer "C" record
  lines.push(`C${input.payees.length.toString().padStart(8, '0')}`)

  // End-of-transmission "F" record
  lines.push(`F${input.payees.length.toString().padStart(8, '0')}`)

  return lines.join('\n')
}

/** Stub for future automated submission. */
export async function submitToFIRE(): Promise<EfilingResult> {
  return {
    ok: false,
    provider: 'irs_fire',
    error: 'Automated FIRE submission not yet implemented — upload built file manually to fire.irs.gov',
  }
}
