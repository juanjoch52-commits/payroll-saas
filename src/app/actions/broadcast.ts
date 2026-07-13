'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/platform'

export type CreateBroadcastResult =
  | { success: true; delivered?: number; error?: undefined }
  | { success: false; error: string }

type TargetType = 'all' | 'plan' | 'tenant' | 'role'

const MAX_RECIPIENTS = 5000
const CHUNK = 500

type AdminClient = ReturnType<typeof createAdminClient>

/** Resuelve los user_ids destinatarios según el segmento del broadcast. */
async function resolveTargetUserIds(
  admin: AdminClient,
  targetType: TargetType,
  targetValue: string | null,
): Promise<string[]> {
  const uniq = (ids: string[]) => Array.from(new Set(ids)).slice(0, MAX_RECIPIENTS)

  if (targetType === 'tenant' && targetValue) {
    const { data } = await admin.from('memberships').select('user_id').eq('organization_id', targetValue)
    return uniq((data ?? []).map((m: { user_id: string }) => m.user_id))
  }
  if (targetType === 'role' && targetValue) {
    const { data } = await admin.from('memberships').select('user_id').eq('role', targetValue)
    return uniq((data ?? []).map((m: { user_id: string }) => m.user_id))
  }
  if (targetType === 'plan' && targetValue) {
    const { data: plan } = await admin.from('plans').select('id').eq('code', targetValue).maybeSingle()
    if (!plan) return []
    const { data: subs } = await admin
      .from('subscriptions')
      .select('organization_id')
      .eq('plan_id', (plan as { id: string }).id)
    const orgIds = (subs ?? []).map((s: { organization_id: string }) => s.organization_id)
    if (orgIds.length === 0) return []
    const { data } = await admin.from('memberships').select('user_id').in('organization_id', orgIds)
    return uniq((data ?? []).map((m: { user_id: string }) => m.user_id))
  }
  // all
  const { data } = await admin.from('memberships').select('user_id')
  return uniq((data ?? []).map((m: { user_id: string }) => m.user_id))
}

export async function createBroadcast(formData: FormData): Promise<CreateBroadcastResult> {
  try {
    await requirePlatformAdmin('en')
  } catch {
    return { success: false, error: 'Unauthorized' }
  }

  const title = String(formData.get('title') || '').trim()
  const body = String(formData.get('body') || '').trim()
  const target_type = (String(formData.get('target_type') || 'all') as TargetType) || 'all'
  const target_value = String(formData.get('target_value') || '') || null
  const cta_label = String(formData.get('cta_label') || '') || null
  const cta_url = String(formData.get('cta_url') || '') || null
  const channels = JSON.parse(String(formData.get('channels') || '["inapp"]')) as string[]

  if (!title || !body) return { success: false, error: 'Title and body required' }

  const admin = createAdminClient()
  const {
    data: { user },
  } = await createClient().auth.getUser()

  const { data: broadcast, error } = await admin
    .from('broadcasts')
    .insert({
      sent_by: user?.id,
      target_type,
      target_value,
      title,
      body,
      cta_label,
      cta_url,
      channels,
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !broadcast) {
    return { success: false, error: error?.message ?? 'Could not create broadcast' }
  }

  const broadcastId = (broadcast as { id: string }).id

  // Entrega in-app inmediata (segura para grandes audiencias): una notificación
  // por usuario + registro de entrega. Email/SMS/push de un broadcast masivo
  // requerirían un worker en cola (fuera de alcance aquí).
  let delivered = 0
  try {
    const userIds = await resolveTargetUserIds(admin, target_type, target_value)
    const now = new Date().toISOString()
    for (let i = 0; i < userIds.length; i += CHUNK) {
      const slice = userIds.slice(i, i + CHUNK)
      const notifRows = slice.map((uid) => ({
        user_id: uid,
        organization_id: target_type === 'tenant' ? target_value : null,
        type: 'broadcast',
        title,
        body,
        data: { broadcast_id: broadcastId },
        cta_label,
        cta_url,
        dedupe_key: `broadcast:${broadcastId}`,
      }))
      await admin
        .from('notifications')
        .upsert(notifRows, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })

      const deliveryRows = slice.map((uid) => ({
        broadcast_id: broadcastId,
        user_id: uid,
        channel: 'inapp',
        status: 'sent',
        delivered_at: now,
      }))
      await admin.from('broadcast_deliveries').insert(deliveryRows)
      delivered += slice.length
    }
  } catch {
    // La entrega es best-effort; el broadcast ya quedó registrado.
  }

  return { success: true, delivered }
}
