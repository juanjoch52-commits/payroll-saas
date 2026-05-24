import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// =============================================================================
// POST /api/webhooks/myravex — STUB
// =============================================================================
// Placeholder hasta que MyRavex defina su API/firmas. Recibe el payload,
// lo guarda en `webhook_events` para deduplicación e inspección, y devuelve
// 200. NO procesa nada en este momento.
//
// Cuando MyRavex publique su contrato:
//   1) Validar `x-myravex-signature` con secret compartido.
//   2) Procesar eventos según `event.type` (employee.created, time.entry, etc.).
//   3) Actualizar `webhook_events.processed_at`.
// =============================================================================

export async function POST(req: Request) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const signature = req.headers.get('x-myravex-signature') // TODO: validar
  const eventType = (payload as { event_type?: string })?.event_type ?? 'unknown'
  const externalId = (payload as { id?: string })?.id ?? null
  const orgId = (payload as { organization_id?: string })?.organization_id ?? null

  const admin = createAdminClient()
  await admin
    .from('webhook_events')
    .insert({
      provider: 'myravex',
      external_id: externalId,
      event_type: eventType,
      payload: payload as Record<string, unknown>,
      organization_id: orgId,
    })
    .select()
    .maybeSingle()

  // TODO: cuando MyRavex publique spec, mover la lógica de procesamiento aquí.
  void signature

  return NextResponse.json({ received: true })
}
