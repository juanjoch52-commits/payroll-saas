'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/platform'

export type CreateBroadcastResult =
  | { success: true; error?: undefined }
  | { success: false; error: string }

export async function createBroadcast(formData: FormData): Promise<CreateBroadcastResult> {
  try {
    await requirePlatformAdmin('en')
  } catch {
    return { success: false, error: 'Unauthorized' }
  }

  const title = String(formData.get('title') || '').trim()
  const body = String(formData.get('body') || '').trim()
  const target_type = String(formData.get('target_type') || 'all') as
    | 'all'
    | 'plan'
    | 'tenant'
    | 'role'
  const target_value = String(formData.get('target_value') || '') || null
  const cta_label = String(formData.get('cta_label') || '') || null
  const cta_url = String(formData.get('cta_url') || '') || null
  const channels = JSON.parse(String(formData.get('channels') || '["inapp"]')) as string[]

  if (!title || !body) return { success: false, error: 'Title and body required' }

  const admin = createAdminClient()
  const { data: { user } } = await (await import('@/lib/supabase/server')).createClient().auth.getUser()

  const { error } = await admin.from('broadcasts').insert({
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

  if (error) return { success: false, error: error.message }

  // TODO F6: dispatch() to per-user notifications via lib/notifications/dispatch
  // For now we just record the broadcast row; the notif system in F6 reads from
  // here and fans out per user/channel based on preferences.

  return { success: true }
}
