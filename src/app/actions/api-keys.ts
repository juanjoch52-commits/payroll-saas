'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { checkFeature } from '@/lib/auth/checkFeature'

// =============================================================================
// Server Actions — API Keys
// =============================================================================

const createSchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.array(z.string()).default(['employees:read']),
})

export type CreateApiKeyResult =
  | { success: true; key: string; prefix: string }
  | { success: false; error: string }

/**
 * Genera una API key nueva. Devuelve la clave EN PLANO al cliente UNA VEZ
 * (no se vuelve a poder mostrar). Sólo el hash se guarda en la BD.
 *
 * Formato: `jk_live_<24 chars alfanuméricos>` para producción.
 */
export async function createApiKey(formData: FormData): Promise<CreateApiKeyResult> {
  const parsed = createSchema.safeParse({
    name: formData.get('name'),
    scopes: (formData.getAll('scopes') as string[]) ?? [],
  })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const session = await requireSession('/en/login')

  const enabled = await checkFeature(session.organizationId, 'api_access')
  if (!enabled) {
    return { success: false, error: 'API access requires the Premium Bundle plan.' }
  }

  // Generar 24 chars alfanuméricos seguros
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map((b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36])
    .join('')

  const key = `jk_live_${randomPart}`
  const prefix = key.slice(0, 12)
  const hash = await bcrypt.hash(key, 10)

  const supabase = createClient()
  const { error } = await supabase.from('api_keys').insert({
    organization_id: session.organizationId,
    name: parsed.data.name,
    key_prefix: prefix,
    key_hash: hash,
    scopes: parsed.data.scopes,
    created_by: session.userId,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/(app)/settings/api-keys', 'page')
  return { success: true, key, prefix }
}

export async function revokeApiKey(keyId: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  const supabase = createClient()

  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('organization_id', session.organizationId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/settings/api-keys', 'page')
  return { success: true }
}
