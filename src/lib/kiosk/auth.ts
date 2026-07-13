import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Autenticación del dispositivo kiosko vía device_token.
 *
 * La tablet manda su token (guardado en localStorage tras emparejar). El
 * servidor:
 *   1) Toma el prefijo (primeros 12 chars) para lookup rápido.
 *   2) Verifica bcrypt(token, hash) contra los candidatos del prefijo.
 *   3) Si pasa: devuelve la org + worksite ligados al dispositivo.
 *
 * Mismo patrón que `authenticateApiRequest` (src/lib/api/auth.ts). El
 * organizationId/worksiteId SIEMPRE salen de la fila del device, nunca del
 * cliente — así una tablet no puede tocar datos de otro tenant.
 */

export type KioskAuthResult =
  | { ok: true; deviceId: string; organizationId: string; worksiteId: string }
  | { ok: false; error: string }

/** Formato del token: kdv_ + 24+ alfanuméricos. */
export const KIOSK_TOKEN_RE = /^kdv_[a-zA-Z0-9]{24,}$/

export async function authenticateKioskDevice(token: string): Promise<KioskAuthResult> {
  if (!token || !KIOSK_TOKEN_RE.test(token)) {
    return { ok: false, error: 'Invalid device token.' }
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { ok: false, error: 'Kiosk no disponible (servidor sin configurar).' }
  }

  const prefix = token.slice(0, 12)
  const { data: candidates } = await admin
    .from('kiosk_devices')
    .select('id, organization_id, worksite_id, device_token_hash, is_active')
    .eq('device_token_prefix', prefix)
    .eq('is_active', true)

  if (!candidates || candidates.length === 0) {
    return { ok: false, error: 'Device not found or inactive.' }
  }

  for (const c of candidates as {
    id: string
    organization_id: string
    worksite_id: string
    device_token_hash: string | null
    is_active: boolean
  }[]) {
    if (!c.device_token_hash) continue
    if (await bcrypt.compare(token, c.device_token_hash)) {
      // Marca actividad (fire-and-forget).
      admin
        .from('kiosk_devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', c.id)
        .then(() => {})
      return {
        ok: true,
        deviceId: c.id,
        organizationId: c.organization_id,
        worksiteId: c.worksite_id,
      }
    }
  }

  return { ok: false, error: 'Invalid device token.' }
}
