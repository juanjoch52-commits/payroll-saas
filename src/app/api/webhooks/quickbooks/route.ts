import { NextResponse } from 'next/server'
import { createHmac, randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'

// =============================================================================
// POST /api/webhooks/quickbooks — STUB (con verificación de firma real)
// =============================================================================
// QuickBooks Online firma las notificaciones con HMAC-SHA256(body, verifier)
// en el header `intuit-signature` (base64). Verificamos si hay verifier token,
// guardamos el evento para deduplicación/inspección, y devolvemos 200. El
// procesamiento real (re-sync ante cambios) se añade cuando se necesite.
// =============================================================================

export async function POST(req: Request) {
  const body = await req.text()

  const verifier = process.env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN
  if (verifier) {
    const signature = req.headers.get('intuit-signature') ?? ''
    const expected = createHmac('sha256', verifier).update(body).digest('base64')
    if (signature !== expected) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    // Fail-closed en producción: sin verifier no se aceptan notificaciones
    // (evita aceptar payloads sin verificar si la env var falta en prod).
    return NextResponse.json({ error: 'webhook not configured' }, { status: 503 })
  }

  let payload: Record<string, unknown> = {}
  try {
    payload = body ? JSON.parse(body) : {}
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    await admin
      .from('webhook_events')
      .insert({
        provider: 'quickbooks',
        external_id: randomUUID(),
        event_type: 'notification',
        payload,
      })
      .select()
      .maybeSingle()
  } catch {
    // Sin service role key (dev): no-op. El stub igual responde 200.
  }

  // TODO: procesar eventChangeNotifications (re-sync de entidades modificadas).
  return NextResponse.json({ received: true })
}
