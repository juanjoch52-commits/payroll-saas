import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode, verifyState, isQuickBooksConfigured } from '@/lib/integrations/quickbooks/client'
import { encryptJson } from '@/lib/crypto/secretbox'
import { createAdminClient } from '@/lib/supabase/server'

// =============================================================================
// OAuth2 callback de QuickBooks Online.
// Intuit redirige aquí con ?code, ?realmId, ?state. Validamos el state (CSRF),
// intercambiamos el code por tokens, los ciframos y guardamos en `integrations`.
// Va bajo /api/ → el middleware lo deja pasar (sin locale ni sesión).
// =============================================================================

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin
  const code = url.searchParams.get('code')
  const realmId = url.searchParams.get('realmId')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  const back = (locale: string, status: string) =>
    NextResponse.redirect(
      `${appUrl}/${locale}/settings/integrations?qbo=${encodeURIComponent(status)}`,
    )

  // El usuario canceló en Intuit.
  if (oauthError) {
    const v = state ? verifyState(state) : null
    return back(v?.locale ?? 'en', 'error')
  }

  if (!code || !realmId || !state) return back('en', 'error')

  const verified = verifyState(state)
  if (!verified) return back('en', 'error')
  const { orgId, locale } = verified

  if (!isQuickBooksConfigured()) return back(locale, 'not_configured')

  try {
    const tokens = await exchangeCode(code, realmId)
    const admin = createAdminClient()

    // Preserva el accountMapping existente si ya había uno.
    const { data: existing } = await admin
      .from('integrations')
      .select('config')
      .eq('organization_id', orgId)
      .eq('provider', 'quickbooks')
      .maybeSingle()
    const prevConfig = (existing as { config: Record<string, unknown> | null } | null)?.config ?? {}

    await admin.from('integrations').upsert(
      {
        organization_id: orgId,
        provider: 'quickbooks',
        status: 'active',
        credentials_encrypted: encryptJson(tokens),
        config: { ...prevConfig, realmId },
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,provider' },
    )

    return back(locale, 'connected')
  } catch (e) {
    return back(locale, 'error')
  }
}
