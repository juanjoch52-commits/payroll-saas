import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'

// =============================================================================
// POST /api/webhooks/myravex — STUB (fail-closed)
// =============================================================================
// Hasta que MyRavex publique su contrato, el endpoint NO acepta escrituras a
// menos que `MYRAVEX_WEBHOOK_SECRET` esté configurado y la firma HMAC-SHA256 del
// cuerpo coincida con `x-myravex-signature`. Esto cierra la escritura abierta no
// autenticada anterior. NUNCA se confía en `organization_id` del payload
// (riesgo cross-tenant) — se resolvería server-side al procesar.
// =============================================================================

export async function POST(req: Request) {
  const secret = process.env.MYRAVEX_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const raw = await req.text()
  const signature = req.headers.get('x-myravex-signature') ?? ''
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex')
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = (payload as { event_type?: string })?.event_type ?? 'unknown'
  const externalId = (payload as { id?: string })?.id ?? null

  const admin = createAdminClient()
  await admin
    .from('webhook_events')
    .insert({
      provider: 'myravex',
      external_id: externalId,
      event_type: eventType,
      payload: payload as Record<string, unknown>,
      organization_id: null, // no se confía en el org_id del cliente
    })
    .select()
    .maybeSingle()

  return NextResponse.json({ received: true })
}
