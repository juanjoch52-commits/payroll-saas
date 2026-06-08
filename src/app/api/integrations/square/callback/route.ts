import { NextResponse } from 'next/server'
import { exchangeCode, verifyState, isSquareConfigured } from '@/lib/integrations/square/client'
import { encryptJson } from '@/lib/crypto/secretbox'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const back = (locale: string, status: string) =>
    NextResponse.redirect(`${appUrl}/${locale}/settings/integrations?square=${encodeURIComponent(status)}`)

  if (!code || !state) return back('en', 'error')
  const v = verifyState(state)
  if (!v) return back('en', 'error')
  if (!isSquareConfigured()) return back(v.locale, 'not_configured')

  try {
    const tokens = await exchangeCode(code)
    const admin = createAdminClient()
    await admin.from('integrations').upsert(
      {
        organization_id: v.orgId,
        provider: 'square',
        status: 'active',
        credentials_encrypted: encryptJson(tokens),
        config: { merchantId: tokens.merchantId ?? null },
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,provider' },
    )
    return back(v.locale, 'connected')
  } catch {
    return back(v.locale, 'error')
  }
}
