import { createAdminClient } from '@/lib/supabase/server'
import { WEBHOOK_EVENTS, type WebhookEvent } from './events'
import { signPayload, generateWebhookSecret } from './sign'

export { WEBHOOK_EVENTS, signPayload, generateWebhookSecret }
export type { WebhookEvent }

// =============================================================================
// Webhooks salientes — dispatcher
// =============================================================================
// POSTea un payload JSON firmado a cada endpoint activo de la org suscrito al
// evento. La firma va en `X-MyJova-Signature: sha256=<hmac>` calculada sobre el
// cuerpo EXACTO con el `secret` del endpoint, para que el receptor la verifique.
//
// Diseño defensivo: nunca lanza. Cualquier fallo (sin service role, endpoint
// caído, timeout) se traga para no romper la acción de negocio que lo disparó.
// Cada intento se registra en `webhook_deliveries`.
// =============================================================================

const TIMEOUT_MS = 8000

/**
 * Entrega `event` (+ `data`) a todos los endpoints activos de la org suscritos.
 * No bloquea de forma crítica: corre los POSTs en paralelo con timeout.
 */
export async function dispatchWebhook(
  organizationId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const admin = createAdminClient()

    const { data: endpoints } = await admin
      .from('webhook_endpoints')
      .select('id, url, secret')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .contains('events', [event])

    if (!endpoints || endpoints.length === 0) return

    const payload = { event, createdAt: new Date().toISOString(), data }
    const body = JSON.stringify(payload)

    await Promise.allSettled(
      (endpoints as { id: string; url: string; secret: string }[]).map(async (ep) => {
        let statusCode: number | null = null
        let ok = false
        let errMsg: string | null = null
        try {
          const res = await fetch(ep.url, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'user-agent': 'MyJova-Webhooks/1.0',
              'x-myjova-event': event,
              'x-myjova-signature': signPayload(ep.secret, body),
            },
            body,
            signal: AbortSignal.timeout(TIMEOUT_MS),
          })
          statusCode = res.status
          ok = res.ok
          if (!res.ok) errMsg = `HTTP ${res.status}`
        } catch (e) {
          errMsg = e instanceof Error ? e.message : 'request failed'
        }
        await admin.from('webhook_deliveries').insert({
          organization_id: organizationId,
          endpoint_id: ep.id,
          event,
          payload,
          status_code: statusCode,
          ok,
          error: errMsg,
        })
      }),
    )
  } catch {
    // Silencioso por diseño: el webhook nunca debe romper la acción que lo dispara.
  }
}
