/**
 * Track1099 wrapper.
 *
 * Track1099 is a popular 3rd-party for e-filing 1099-NEC / 1099-MISC to IRS
 * and providing recipient copies. We post a batch of recipients and forms,
 * then poll status. The API key is per-account from the Track1099 dashboard.
 *
 * Documented at: https://www.track1099.com/info/api
 *
 * In production, you'll need:
 *   - TRACK1099_API_KEY in env
 *   - A registered Payer (your tenant's company)
 *   - A live API allowlist
 *
 * Without TRACK1099_API_KEY this returns a deterministic mock submission ID
 * so the rest of the wizard / UI can be exercised end-to-end in dev.
 */
import type { EfilingResult } from './types'

const API_KEY = process.env.TRACK1099_API_KEY
const BASE_URL = 'https://www.track1099.com/api/v1'

export type Track1099Recipient = {
  recipientName: string
  recipientTin: string // SSN or EIN
  recipientAddress: string
  recipientCity: string
  recipientState: string
  recipientZip: string
  totalCompensation: number // cents
}

export type Track1099SubmitInput = {
  taxYear: number
  payer: {
    name: string
    ein: string
    address: string
    city: string
    state: string
    zip: string
  }
  recipients: Track1099Recipient[]
}

export async function submit1099Batch(input: Track1099SubmitInput): Promise<EfilingResult> {
  if (!API_KEY) {
    // Mock for dev — deterministic so the UI test is repeatable
    const mockId = `mock_track1099_${input.taxYear}_${input.recipients.length}`
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        `[track1099] (mock — no API key) Would submit ${input.recipients.length} 1099-NECs for ${input.payer.name}`,
      )
    }
    return { ok: true, provider: 'track1099', submissionId: mockId, status: 'submitted' }
  }

  try {
    const res = await fetch(`${BASE_URL}/submissions`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        tax_year: input.taxYear,
        payer: {
          name: input.payer.name,
          tin: input.payer.ein,
          address: input.payer.address,
          city: input.payer.city,
          state: input.payer.state,
          zip: input.payer.zip,
        },
        forms: input.recipients.map((r) => ({
          form_type: '1099-NEC',
          recipient_name: r.recipientName,
          recipient_tin: r.recipientTin,
          recipient_address: r.recipientAddress,
          recipient_city: r.recipientCity,
          recipient_state: r.recipientState,
          recipient_zip: r.recipientZip,
          box1_nonemployee_compensation: (r.totalCompensation / 100).toFixed(2),
        })),
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, provider: 'track1099', error: `${res.status} ${body.slice(0, 200)}` }
    }
    const data = await res.json()
    return {
      ok: true,
      provider: 'track1099',
      submissionId: String(data.submission_id ?? 'unknown'),
      status: 'submitted',
    }
  } catch (e) {
    return { ok: false, provider: 'track1099', error: e instanceof Error ? e.message : String(e) }
  }
}
