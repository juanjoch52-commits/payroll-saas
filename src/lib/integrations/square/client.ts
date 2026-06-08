import { createHmac } from 'node:crypto'
import { isEncryptionConfigured } from '@/lib/crypto/secretbox'

// =============================================================================
// Cliente fino de Square (OAuth2 + Payments API) — para importar el total de
// propinas por día desde el POS. Degrada a stub si faltan llaves.
// =============================================================================

export type SquareTokens = {
  accessToken: string
  refreshToken: string
  merchantId?: string
  expiresAt: number
}

function base() {
  return process.env.SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com'
}
function redirectUri() {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/integrations/square/callback`
}

export function isSquareConfigured(): boolean {
  return Boolean(
    process.env.SQUARE_APP_ID && process.env.SQUARE_APP_SECRET && isEncryptionConfigured(),
  )
}

export function signState(orgId: string, locale: string): string {
  const mac = createHmac('sha256', process.env.SQUARE_APP_SECRET ?? 'dev')
    .update(`${orgId}|${locale}`)
    .digest('hex')
    .slice(0, 32)
  return `${orgId}|${locale}|${mac}`
}
export function verifyState(state: string): { orgId: string; locale: string } | null {
  const [orgId, locale, mac] = state.split('|')
  if (!orgId || !locale || !mac) return null
  const expected = createHmac('sha256', process.env.SQUARE_APP_SECRET ?? 'dev')
    .update(`${orgId}|${locale}`)
    .digest('hex')
    .slice(0, 32)
  return mac === expected ? { orgId, locale } : null
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SQUARE_APP_ID ?? '',
    scope: 'PAYMENTS_READ MERCHANT_PROFILE_READ',
    state,
    session: 'false',
    redirect_uri: redirectUri(),
  })
  return `${base()}/oauth2/authorize?${params.toString()}`
}

async function tokenRequest(body: Record<string, string>): Promise<{
  access_token: string
  refresh_token: string
  expires_at: string
  merchant_id?: string
}> {
  const res = await fetch(`${base()}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Square-Version': '2024-01-18' },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APP_ID,
      client_secret: process.env.SQUARE_APP_SECRET,
      redirect_uri: redirectUri(),
      ...body,
    }),
  })
  if (!res.ok) throw new Error(`Square token error ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function exchangeCode(code: string): Promise<SquareTokens> {
  const j = await tokenRequest({ grant_type: 'authorization_code', code })
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    merchantId: j.merchant_id,
    expiresAt: new Date(j.expires_at).getTime(),
  }
}

export async function refreshTokens(refreshToken: string): Promise<SquareTokens> {
  const j = await tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken })
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? refreshToken,
    merchantId: j.merchant_id,
    expiresAt: new Date(j.expires_at).getTime(),
  }
}

/** Lista pagos en un rango y devuelve el total de propinas por día (cents). */
export async function fetchTipTotals(
  tokens: SquareTokens,
  startISO: string,
  endISO: string,
): Promise<{ byDate: Record<string, number>; tokens: SquareTokens }> {
  let t = tokens
  if (Date.now() > t.expiresAt - 5 * 60 * 1000) t = await refreshTokens(t.refreshToken)

  const byDate: Record<string, number> = {}
  let cursor: string | undefined
  do {
    const params = new URLSearchParams({ begin_time: startISO, end_time: endISO, limit: '100' })
    if (cursor) params.set('cursor', cursor)
    const res = await fetch(`${base()}/v2/payments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${t.accessToken}`, 'Square-Version': '2024-01-18' },
    })
    if (!res.ok) throw new Error(`Square API ${res.status}: ${await res.text()}`)
    const json = (await res.json()) as {
      payments?: { created_at: string; tip_money?: { amount?: number } }[]
      cursor?: string
    }
    for (const p of json.payments ?? []) {
      const tip = p.tip_money?.amount ?? 0
      if (tip > 0) {
        const day = p.created_at.slice(0, 10)
        byDate[day] = (byDate[day] ?? 0) + tip
      }
    }
    cursor = json.cursor
  } while (cursor)

  return { byDate, tokens: t }
}
