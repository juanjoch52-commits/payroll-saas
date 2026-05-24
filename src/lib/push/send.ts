/**
 * Web Push (VAPID) sender. Lee suscripciones de la tabla push_subscriptions
 * y envía a cada endpoint registrado por el usuario.
 *
 * En dev sin VAPID configurado, log to console y skip.
 *
 * Generar VAPID keys una vez: `npx web-push generate-vapid-keys`
 */
import webpush from 'web-push'

import { createAdminClient } from '@/lib/supabase/server'

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const PRIVATE = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@myjova.com'

let configured = false
function ensureConfigured(): boolean {
  if (configured) return true
  if (!PUBLIC || !PRIVATE) return false
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE)
    configured = true
    return true
  } catch {
    return false
  }
}

export type PushPayload = {
  title: string
  body: string
  url?: string
  icon?: string
}

export type SendPushResult = {
  attempted: number
  delivered: number
  failed: number
  skipped: boolean
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<SendPushResult> {
  if (!ensureConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[push] (skipped, no VAPID keys) → user ${userId}: ${payload.title}`)
    }
    return { attempted: 0, delivered: 0, failed: 0, skipped: true }
  }

  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) {
    return { attempted: 0, delivered: 0, failed: 0, skipped: false }
  }

  let delivered = 0
  let failed = 0
  const payloadStr = JSON.stringify(payload)

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payloadStr,
        )
        delivered++
        await admin
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', s.id)
      } catch (e) {
        failed++
        const err = e as { statusCode?: number }
        // 410 Gone or 404 Not Found → suscripción muerta, eliminar
        if (err.statusCode === 410 || err.statusCode === 404) {
          await admin.from('push_subscriptions').delete().eq('id', s.id)
        }
      }
    }),
  )

  return { attempted: subs.length, delivered, failed, skipped: false }
}
