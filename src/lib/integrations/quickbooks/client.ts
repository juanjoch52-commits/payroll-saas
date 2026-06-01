import { createHmac } from 'node:crypto'
import { isEncryptionConfigured } from '@/lib/crypto/secretbox'
import type { QboTokens } from './types'

// =============================================================================
// Cliente fino de QuickBooks Online (OAuth2 + REST), sin SDK pesado.
// =============================================================================
// Degradación elegante: si faltan QUICKBOOKS_CLIENT_ID/SECRET o la
// ENCRYPTION_KEY, `isQuickBooksConfigured()` devuelve false y la UI ofrece el
// export de archivos (IIF/CSV) + un stub determinista en vez de llamadas reales.
// =============================================================================

const AUTH_BASE = 'https://appcenter.intuit.com/connect/oauth2'
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
const SCOPE = 'com.intuit.quickbooks.accounting'

export function isQuickBooksConfigured(): boolean {
  return Boolean(
    process.env.QUICKBOOKS_CLIENT_ID &&
      process.env.QUICKBOOKS_CLIENT_SECRET &&
      isEncryptionConfigured(),
  )
}

function apiBase(): string {
  return process.env.QUICKBOOKS_ENVIRONMENT === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'
}

function redirectUri(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/integrations/quickbooks/callback`
}

// --- CSRF state firmado (HMAC con el client secret, sin env extra) ----------
export function signState(orgId: string, locale: string): string {
  const payload = `${orgId}|${locale}`
  const mac = createHmac('sha256', process.env.QUICKBOOKS_CLIENT_SECRET ?? 'dev')
    .update(payload)
    .digest('hex')
    .slice(0, 32)
  return `${orgId}|${locale}|${mac}`
}

export function verifyState(state: string): { orgId: string; locale: string } | null {
  const parts = state.split('|')
  if (parts.length !== 3) return null
  const [orgId, locale, mac] = parts
  const expected = createHmac('sha256', process.env.QUICKBOOKS_CLIENT_SECRET ?? 'dev')
    .update(`${orgId}|${locale}`)
    .digest('hex')
    .slice(0, 32)
  if (mac !== expected) return null
  return { orgId, locale }
}

// --- OAuth ------------------------------------------------------------------
export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.QUICKBOOKS_CLIENT_ID ?? '',
    response_type: 'code',
    scope: SCOPE,
    redirect_uri: redirectUri(),
    state,
  })
  return `${AUTH_BASE}?${params.toString()}`
}

async function tokenRequest(body: Record<string, string>): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const basic = Buffer.from(
    `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`,
  ).toString('base64')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(body).toString(),
  })
  if (!res.ok) {
    throw new Error(`QBO token error ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

export async function exchangeCode(code: string, realmId: string): Promise<QboTokens> {
  const json = await tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
  })
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    realmId,
    expiresAt: Date.now() + json.expires_in * 1000,
  }
}

export async function refreshTokens(refreshToken: string, realmId: string): Promise<QboTokens> {
  const json = await tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken })
  return {
    accessToken: json.access_token,
    // QBO rota el refresh token: persiste el nuevo.
    refreshToken: json.refresh_token ?? refreshToken,
    realmId,
    expiresAt: Date.now() + json.expires_in * 1000,
  }
}

/**
 * Llama a la API REST de QBO. Si el access token está por expirar, lo refresca
 * y devuelve los tokens nuevos para que el caller los persista.
 */
export async function qboApiFetch(
  tokens: QboTokens,
  path: string,
  init?: RequestInit,
): Promise<{ json: unknown; tokens: QboTokens }> {
  let t = tokens
  if (Date.now() > t.expiresAt - 5 * 60 * 1000) {
    t = await refreshTokens(t.refreshToken, t.realmId)
  }
  const res = await fetch(`${apiBase()}/v3/company/${t.realmId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${t.accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    throw new Error(`QBO API error ${res.status}: ${await res.text()}`)
  }
  return { json: await res.json(), tokens: t }
}
