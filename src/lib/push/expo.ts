/**
 * Expo Push sender — envía notificaciones a la app móvil (tokens de
 * expo_push_tokens) vía la Expo Push API. No requiere key (EXPO_ACCESS_TOKEN
 * es opcional y sube los límites). Limpia tokens muertos (DeviceNotRegistered).
 */
import { createAdminClient } from '@/lib/supabase/server'
import type { PushPayload, SendPushResult } from './send'

const EXPO_URL = 'https://exp.host/--/api/v2/push/send'

export async function sendExpoPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<SendPushResult> {
  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { attempted: 0, delivered: 0, failed: 0, skipped: true }
  }

  const { data: tokens } = await admin
    .from('expo_push_tokens')
    .select('id, expo_token')
    .eq('user_id', userId)

  const rows = (tokens ?? []) as { id: string; expo_token: string }[]
  if (rows.length === 0) return { attempted: 0, delivered: 0, failed: 0, skipped: false }

  const messages = rows.map((r) => ({
    to: r.expo_token,
    title: payload.title,
    body: payload.body,
    data: payload.url ? { url: payload.url } : {},
  }))

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`

  try {
    const res = await fetch(EXPO_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(messages),
    })
    if (!res.ok) return { attempted: rows.length, delivered: 0, failed: rows.length, skipped: false }

    const json = (await res.json()) as {
      data?: { status: string; details?: { error?: string } }[]
    }
    const results = json.data ?? []
    let delivered = 0
    let failed = 0
    await Promise.all(
      results.map(async (r, i) => {
        if (r.status === 'ok') {
          delivered++
        } else {
          failed++
          if (r.details?.error === 'DeviceNotRegistered' && rows[i]) {
            await admin.from('expo_push_tokens').delete().eq('id', rows[i].id)
          }
        }
      }),
    )
    await admin
      .from('expo_push_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .in(
        'id',
        rows.map((r) => r.id),
      )

    return { attempted: rows.length, delivered, failed, skipped: false }
  } catch {
    return { attempted: rows.length, delivered: 0, failed: rows.length, skipped: false }
  }
}
