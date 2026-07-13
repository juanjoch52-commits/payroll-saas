import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Autenticación de la API REST pública de MyJova vía Bearer token.
 *
 * El cliente manda:
 *   Authorization: Bearer jk_live_abc123...
 *
 * El servidor:
 *   1) Toma el prefijo (primeros 12 chars) para hacer un lookup rápido.
 *   2) Verifica bcrypt(key, hash) contra los matches del prefijo.
 *   3) Si pasa: devuelve { organization_id, scopes, api_key_id }.
 */

export type ApiAuthResult =
  | { ok: true; organizationId: string; scopes: string[]; apiKeyId: string }
  | { ok: false; status: number; error: string }

export async function authenticateApiRequest(req: Request): Promise<ApiAuthResult> {
  const header = req.headers.get('authorization')
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, error: 'Missing or invalid Authorization header.' }
  }

  const key = header.slice(7).trim()
  if (!/^jk_(live|test)_[a-zA-Z0-9]{16,}$/.test(key)) {
    return { ok: false, status: 401, error: 'Invalid API key format.' }
  }

  const prefix = key.slice(0, 12) // ej. "jk_live_a1b2"

  const admin = createAdminClient()
  const { data: candidates } = await admin
    .from('api_keys')
    .select('id, organization_id, scopes, key_hash, revoked_at, expires_at')
    .eq('key_prefix', prefix)
    .is('revoked_at', null)

  if (!candidates || candidates.length === 0) {
    return { ok: false, status: 401, error: 'API key not found.' }
  }

  for (const candidate of candidates) {
    if (candidate.expires_at && new Date(candidate.expires_at) < new Date()) continue
    const match = await bcrypt.compare(key, candidate.key_hash)
    if (match) {
      // Actualiza last_used_at de forma fire-and-forget.
      admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', candidate.id).then(() => {})
      return {
        ok: true,
        organizationId: candidate.organization_id,
        scopes: candidate.scopes ?? [],
        apiKeyId: candidate.id,
      }
    }
  }

  return { ok: false, status: 401, error: 'Invalid API key.' }
}

/**
 * Verifica que la API key tenga el scope necesario para la operación.
 * Devuelve true si el scope está en la lista o si la key tiene scope `*`.
 */
export function hasScope(scopes: string[], required: string): boolean {
  return scopes.includes('*') || scopes.includes(required)
}
