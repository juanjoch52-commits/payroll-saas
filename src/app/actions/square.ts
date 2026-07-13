'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { checkFeature } from '@/lib/auth/checkFeature'
import {
  isSquareConfigured,
  authorizeUrl,
  signState,
  fetchTipTotals,
  type SquareTokens,
} from '@/lib/integrations/square/client'
import { encryptJson, decryptJson } from '@/lib/crypto/secretbox'

async function gate(): Promise<{ ok: true; orgId: string } | { ok: false; error: string }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) return { ok: false, error: 'No autorizado.' }
  const has = await checkFeature(session.organizationId, 'quickbooks_integration')
  if (!has) return { ok: false, error: 'Tu plan no incluye integraciones POS.' }
  return { ok: true, orgId: session.organizationId }
}

export async function connectSquare(
  locale: string,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const g = await gate()
  if (!g.ok) return { success: false, error: g.error }
  if (!isSquareConfigured()) {
    return { success: false, error: 'Square no está configurado en el servidor (faltan llaves + ENCRYPTION_KEY).' }
  }
  return { success: true, url: authorizeUrl(signState(g.orgId, locale)) }
}

export async function disconnectSquare(): Promise<{ success: boolean; error?: string }> {
  const g = await gate()
  if (!g.ok) return { success: false, error: g.error }
  const admin = createAdminClient()
  await admin
    .from('integrations')
    .update({ status: 'disconnected', credentials_encrypted: null })
    .eq('organization_id', g.orgId)
    .eq('provider', 'square')
  revalidatePath('/(app)/settings/integrations', 'page')
  return { success: true }
}

export async function getSquareTipTotals(
  startDate: string,
  endDate: string,
): Promise<
  | { success: true; mock: boolean; byDate: Record<string, number> }
  | { success: false; error: string }
> {
  const g = await gate()
  if (!g.ok) return { success: false, error: g.error }
  const admin = createAdminClient()
  const { data: row } = await admin
    .from('integrations')
    .select('status, credentials_encrypted')
    .eq('organization_id', g.orgId)
    .eq('provider', 'square')
    .maybeSingle()

  const connected =
    isSquareConfigured() &&
    row &&
    (row as { status: string }).status === 'active' &&
    (row as { credentials_encrypted: string | null }).credentials_encrypted

  if (!connected) {
    // Stub determinista: reporta un total simulado para la fecha de inicio.
    return { success: true, mock: true, byDate: { [startDate]: 12500 } }
  }

  const tokens = decryptJson<SquareTokens>((row as { credentials_encrypted: string }).credentials_encrypted)
  if (!tokens) return { success: false, error: 'Credenciales ilegibles.' }
  try {
    const { byDate, tokens: nt } = await fetchTipTotals(
      tokens,
      `${startDate}T00:00:00Z`,
      `${endDate}T23:59:59Z`,
    )
    await admin
      .from('integrations')
      .update({ credentials_encrypted: encryptJson(nt), last_synced_at: new Date().toISOString() })
      .eq('organization_id', g.orgId)
      .eq('provider', 'square')
    return { success: true, mock: false, byDate }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error de Square.' }
  }
}
